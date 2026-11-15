<?php

namespace App\Http\Controllers\Modules\Report;

use App\Exports\ActionLogReportExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\Report\ActionLogResource;
use App\Jobs\GenerateAccountStatisticsReportJob;
use App\Jobs\GenerateReportJob;
use App\Models\Absence;
use App\Models\ActionLog;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\Enrollment;
use App\Models\GatePass;
use App\Models\Profile;
use App\Models\Program;
use App\Models\Report;
use App\Models\ReportFilter;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Models\User;
use App\Models\Violation;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use App\Http\Resources\System\ProgramResource;
use App\Http\Resources\System\SchoolYearResource;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\AbsentForm\AbsenceResource;
use App\Http\Resources\Appointment\AppointmentResource;
use App\Http\Resources\GatePass\GatePassResource;
use App\Http\Resources\Report\ReportFilterResource;
use App\Http\Resources\Report\ReportResource;
use App\Http\Resources\Complaint\ComplaintSubjectResource;
use App\Http\Resources\Complaint\ComplaintSubjectViolationResource;
use App\Http\Resources\Violation\ViolationResource;

class ReportController extends Controller
{
    /**
     * Shared "Date Range" / "School Year" filter for the whole prefect
     * Report page — one filter card in report.jsx covers every tab instead
     * of each report list having its own copy. Date Range narrows by a raw
     * timestamp column (the caller passes which one); School Year narrows
     * by whether that same column falls within the matching semester's
     * date_start/date_end range, and "semester" further narrows within
     * that school year when picked.
     */
    /**
     * Generated report files live under generated-reports/{super-admin|sub-admin}/{userId}
     * — a top-level split by role (matching each role's own GenerateReportJob/
     * GenerateAccountStatisticsReportJob output dir) so the two report
     * systems' files never mix, on top of the existing per-user scoping.
     */
    private function reportRoleDir(): string
    {
        return auth()->user()->role === 'super_admin' ? 'super-admin' : 'sub-admin';
    }

    private function applyReportFilter($query, string $dateColumn, ?string $relation = null)
    {
        $filterBy = request('filter_by');
        $dateFrom = request('date_from');
        $dateTo = request('date_to');
        $schoolYearId = request('school_year_id');
        $semester = request('semester');

        $constrain = null;

        if ($filterBy === 'date' && $dateFrom && $dateTo) {
            $constrain = fn ($q) => $q->whereBetween($dateColumn, [$dateFrom, "$dateTo 23:59:59"]);
        } elseif ($filterBy === 'school_year' && (! $schoolYearId || $schoolYearId === 'all') && $semester) {
            $constrain = function ($q) use ($dateColumn, $semester) {
                SchoolYearSemester::applyFilter($q, $dateColumn, null, $semester);

                return $q;
            };
        } elseif ($filterBy === 'school_year' && $schoolYearId && $schoolYearId !== 'all') {
            // ('all' = every school year: no limit.)
            $semesters = SchoolYearSemester::allCached()->filter(
                fn (SchoolYearSemester $s) => $s->date_start && $s->date_end
                    && (string) $s->school_year_id === (string) $schoolYearId
                    && (! $semester || (string) $s->semester === (string) $semester)
            );

            $constrain = $semesters->isEmpty()
                ? fn ($q) => $q->whereRaw('1 = 0')
                : function ($q) use ($semesters, $dateColumn) {
                    $q->where(function ($qq) use ($semesters, $dateColumn) {
                        foreach ($semesters as $s) {
                            $qq->orWhereBetween($dateColumn, [$s->date_start->startOfDay(), $s->date_end->endOfDay()]);
                        }
                    });
                };
        }

        if (! $constrain) {
            return $query;
        }

        return $relation ? $query->whereHas($relation, $constrain) : $constrain($query);
    }

    public function index(string $section = 'incident')
    {
        // The section's table (Report Generator: the saved filters): loaded
        // by the page from /api/prefect/report/{section} once it opens, every
        // row (it paginates in the browser). That request skips the rest.
        if (is_list_data_request()) {
            return list_json($this->reportSectionLists($section));
        }

        $top5Students = ComplaintSubjectViolation::select(
            'student_id',
            DB::raw('COUNT(*) as total_offenses')
        )
            ->with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->where(function ($q) {
                $q->whereNotNull('violation_id');
            })
            ->groupBy('student_id')
            ->orderByRaw('COUNT(*) DESC')
            ->take(5)
            ->get()
            ->each(fn ($s) => $s->user->encrypted_id = encrypt_id($s->user->id));

        $violation = Violation::all(['id', 'violation_name']);

        $incident = Complaint::count('incident_id');
        $incidentList = Violation::all(['id', 'violation_name']);

        $resolved = Complaint::where('complaint_status', 'resolved')->count();

        $incidentLineGraph = Complaint::selectRaw('MONTH(created_at) as month, COUNT(*) as total')
            ->whereNot('complaint_status', 'pending')
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', '<=', now()->month)
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('total', 'month');

        $monthlyCounts = [];

        for ($i = 1; $i <= now()->month; $i++) {
            $monthlyCounts[] = $incidentLineGraph[$i] ?? 0;
        }

        $incidentTrendByType = self::incidentTrendSeries(now()->startOfYear(), now(), excludePending: true);

        $data = DB::query()
            ->fromSub(function ($q) {

                // 🔹 Count violations PER STUDENT first
                $q->from('complaint_subject AS cs')
                    ->join('complaint AS c', 'c.id', '=', 'cs.complaint_id')
                    ->join('complaint_subject_violation AS cso', function ($join) {
                        $join->on('cso.complaint_id', '=', 'cs.complaint_id')
                            ->on('cso.student_id', '=', 'cs.student_id');
                    })
                    ->join('enrollment AS e', function ($join) {
                        $join->on('e.student_id', '=', 'cs.student_id')
                            ->where('e.status', '=', 'enrolled');
                    })
                    ->join('program AS p', 'p.id', '=', 'e.program_id')
                    ->select(
                        'p.code AS program',
                        'cs.student_id',
                        DB::raw('COUNT(*) AS student_violations')
                    )
                    ->groupBy('p.code', 'cs.student_id');

            }, 'student_counts')
            ->select(
                'program',

                // ✅ unique students with violations
                DB::raw('COUNT(student_id) AS students_with_violations'),

                // ✅ total = SUM of each student's violations (NO DISTINCT)
                DB::raw('SUM(student_violations) AS total_violations')
            )
            ->groupBy('program')
            ->orderByDesc('total_violations')
            ->get();

        $violationCount = ComplaintSubjectViolation::whereNotNull('violation_id')->count();
        $resolved = Complaint::where('complaint_status', 'resolved')->count();

        return Inertia::render('prefect/report', [
            'section' => $section,
            // Analytical Report: its data comes with the page (filtered by
            // the URL), not from an API call after it loads.
            'analytics' => $section === 'analytics' ? fn () => self::analyticsFor(request()) : null,
            // Statistics tab of the report page being viewed (same filter as
            // its table).
            'report_stats' => $this->reportStats($section),
            'incident' => $incident,
            'incident_line_graph' => $monthlyCounts,
            'incident_trend_series' => $incidentTrendByType['series'],
            'incident_trend_labels' => $incidentTrendByType['labels'],
            'resolution' => 0,
            'resolved' => $resolved,
            'violation_count' => $violationCount,
            'top5_students' => ComplaintSubjectViolationResource::collection($top5Students),
            'violation_list' => ViolationResource::collection($violation),
            'incident_list' => ViolationResource::collection($incidentList),
            'programs' => ProgramResource::collection(Program::all(['id', 'code'])),
            'students' => fn () => UserResource::collection(User::with(['profile', 'program'])->whereRole('student')->get()),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'school_years_full' => SchoolYearResource::collection(SchoolYear::orderByDesc('year')->get(['id', 'year'])),
            'violation_program' => $data,
        ]);
    }

    /**
     * A report page's table, every row (the page's API request; see index()).
     * Report pages: their records, with the page's filter. Report Generator
     * (saved-filters / generated): the prefect's saved report filters.
     */
    private function reportSectionLists(string $section): array
    {
        return match ($section) {
            'incident' => ['report' => ['data' => ComplaintSubjectResource::collection(
                $this->applyReportFilter(self::getAllReport(), 'created_at', 'complaint')
                    ->orderByDesc(
                        Complaint::select('created_at')
                            ->whereColumn('complaint.id', 'complaint_subject.complaint_id')
                    )
                    ->get()
            )]],
            'violation' => ['violation_report' => ['data' => ComplaintSubjectViolationResource::collection(
                $this->applyReportFilter(self::getAllReport('violation'), 'offense_issued_at', 'complaint')
                    ->orderByDesc(
                        Complaint::select('offense_issued_at')
                            ->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id')
                    )
                    ->get()
            )]],
            'tardy' => ['tardy_report' => AbsenceResource::collection($this->applyReportFilter(
                Absence::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->whereNotNull('confirmed_at')
                    ->whereJsonContains('reason', 'Excused Tardiness'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get())],
            'appointment' => ['appointment_report' => AppointmentResource::collection($this->applyReportFilter(
                Appointment::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->where('appointment_status', 'accepted'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get())],
            'gatepass' => ['gatepass_report' => GatePassResource::collection($this->applyReportFilter(
                GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->whereNotNull('confirmed_at'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get())],
            'saved-filters', 'generated' => ['report_filters' => $this->reportFilterIndex()],
            default => [],
        };
    }

    /**
     * The Statistics tab of each prefect report page (same records and
     * filter as its table). Cards: ['label', 'value', 'hint'?, 'icon'].
     * Charts: ['title', 'subtitle'?, 'type' (bar | hbar | line | doughnut),
     * 'data' => [['label', 'value', 'color'?], ...], 'wide'?].
     */
    private function reportStats(string $section): ?array
    {
        $MAJOR = '#ef4444';
        $MINOR = '#f59e0b';
        $pct = fn ($n, $total) => $total ? round($n / $total * 100, 1).'%' : '0%';
        // Students with 2 or more records.
        $repeat = fn ($ids) => collect($ids)->countBy()->filter(fn ($n) => $n >= 2)->count();
        $avg = fn ($total, $people) => $people ? round($total / $people, 1) : 0;

        switch ($section) {
            case 'incident':
                $rows = $this->applyReportFilter(
                    ComplaintSubject::whereHas('complaint', fn ($q) => $q->where('complaint_status', 'resolved')),
                    'created_at', 'complaint'
                )->with('complaint:id,incident_id,created_at')->get(['complaint_id', 'student_id']);
                $types = Violation::pluck('violation_name', 'id');
                $students = $rows->pluck('student_id');

                return [
                    'cards' => [
                        ['label' => 'Total Incidents', 'value' => $rows->count(), 'icon' => 'alert'],
                        ['label' => 'Students Involved', 'value' => $students->unique()->count(), 'icon' => 'users'],
                        ['label' => 'Incident Types', 'value' => $rows->pluck('complaint.incident_id')->filter()->unique()->count(), 'icon' => 'list'],
                        ['label' => 'Repeat Students', 'value' => $repeat($students), 'hint' => 'with 2 or more', 'icon' => 'repeat'],
                        ['label' => 'Avg. per Student', 'value' => $avg($rows->count(), $students->unique()->count()), 'icon' => 'chart'],
                    ],
                    'charts' => [
                        ['title' => 'Incidents per Month', 'type' => 'line', 'data' => $this->countByMonth($rows->pluck('complaint.created_at')), 'wide' => true],
                        ['title' => 'Incidents by Type', 'subtitle' => 'Top 10', 'type' => 'hbar', 'data' => $this->countBy($rows->map(fn ($r) => ucwords(strtolower($types[$r->complaint?->incident_id] ?? 'Other'))), 10)],
                        ['title' => 'Incidents by Program', 'type' => 'bar', 'data' => $this->countByProgram($students)],
                        ['title' => 'Incidents by Year Level', 'type' => 'bar', 'data' => $this->countByYearLevel($students)],
                        ['title' => 'Incidents by Sex', 'type' => 'doughnut', 'data' => $this->countBySex($students)],
                    ],
                ];

            case 'violation':
                $rows = $this->applyReportFilter(
                    ComplaintSubjectViolation::whereNotNull('violation_id')
                        ->whereHas('complaint', fn ($q) => $q->where('complaint_status', 'resolved')),
                    'offense_issued_at', 'complaint'
                )->with(['violation:id,violation_name,offense_status', 'complaint:id,offense_issued_at'])->get(['complaint_id', 'violation_id', 'student_id']);
                $students = $rows->pluck('student_id');
                $major = $rows->filter(fn ($r) => $r->violation?->offense_status)->count();
                $top = $rows->groupBy(fn ($r) => $r->violation_id)
                    ->map(fn ($g) => ['label' => ucwords(strtolower($g->first()->violation?->violation_name ?? 'Unknown')), 'value' => $g->count(), 'color' => $g->first()->violation?->offense_status ? $MAJOR : $MINOR])
                    ->sortByDesc('value')->take(10)->values()->all();

                return [
                    'cards' => [
                        ['label' => 'Total Violations', 'value' => $rows->count(), 'icon' => 'shield'],
                        ['label' => 'Major', 'value' => $major, 'hint' => $pct($major, $rows->count()), 'icon' => 'alert'],
                        ['label' => 'Minor', 'value' => $rows->count() - $major, 'hint' => $pct($rows->count() - $major, $rows->count()), 'icon' => 'shield'],
                        ['label' => 'Students Involved', 'value' => $students->unique()->count(), 'icon' => 'users'],
                        ['label' => 'Repeat Offenders', 'value' => $repeat($students), 'hint' => 'with 2 or more', 'icon' => 'repeat'],
                    ],
                    'charts' => [
                        ['title' => 'Violations per Month', 'type' => 'line', 'data' => $this->countByMonth($rows->pluck('complaint.offense_issued_at')), 'wide' => true],
                        ['title' => 'Most Common Violations', 'subtitle' => 'Top 10 · red = major, amber = minor', 'type' => 'hbar', 'data' => $top],
                        ['title' => 'Severity', 'type' => 'doughnut', 'data' => [
                            ['label' => 'Major', 'value' => $major, 'color' => $MAJOR],
                            ['label' => 'Minor', 'value' => $rows->count() - $major, 'color' => $MINOR],
                        ]],
                        ['title' => 'Violations by Program', 'type' => 'bar', 'data' => $this->countByProgram($students)],
                        ['title' => 'Violations by Year Level', 'type' => 'bar', 'data' => $this->countByYearLevel($students)],
                    ],
                ];

            case 'tardy':
                $rows = $this->applyReportFilter(
                    Absence::whereNotNull('confirmed_at')->whereJsonContains('reason', 'Excused Tardiness'),
                    'confirmed_at'
                )->get(['id', 'student_id', 'confirmed_at', 'date_from']);
                $students = $rows->pluck('student_id');
                $names = User::with('profile')->whereIn('id', $students->unique())->get()
                    ->mapWithKeys(fn ($u) => [$u->id => trim(($u->profile->first_name ?? '').' '.($u->profile->last_name ?? '')) ?: ($u->id_number ?? 'Student')]);

                return [
                    'cards' => [
                        ['label' => 'Total Tardies', 'value' => $rows->count(), 'icon' => 'clock'],
                        ['label' => 'Students', 'value' => $students->unique()->count(), 'icon' => 'users'],
                        ['label' => 'Repeat Late-comers', 'value' => $repeat($students), 'hint' => 'with 2 or more', 'icon' => 'repeat'],
                        ['label' => 'Avg. per Student', 'value' => $avg($rows->count(), $students->unique()->count()), 'icon' => 'chart'],
                    ],
                    'charts' => [
                        ['title' => 'Tardies per Month', 'type' => 'line', 'data' => $this->countByMonth($rows->pluck('confirmed_at')), 'wide' => true],
                        ['title' => 'Tardies by Day of the Week', 'subtitle' => 'Day of the tardiness', 'type' => 'bar', 'data' => $this->countByWeekday($rows->map(fn ($r) => $r->date_from ?? $r->confirmed_at))],
                        ['title' => 'Most Frequent Late-comers', 'subtitle' => 'Top 10', 'type' => 'hbar', 'data' => $this->countBy($students->map(fn ($id) => $names[$id] ?? 'Student'), 10)],
                        ['title' => 'Tardies by Program', 'type' => 'bar', 'data' => $this->countByProgram($students)],
                        ['title' => 'Tardies by Year Level', 'type' => 'bar', 'data' => $this->countByYearLevel($students)],
                    ],
                ];

            case 'appointment':
                $rows = $this->applyReportFilter(
                    Appointment::where('appointment_status', 'accepted'),
                    'confirmed_at'
                )->get(['id', 'user_id', 'attendance_status', 'confirmed_at', 'date_time_appoint']);
                $present = $rows->where('attendance_status', 'present')->count();
                $absent = $rows->where('attendance_status', 'absent')->count();
                $marked = $present + $absent;
                $roles = User::whereIn('id', $rows->pluck('user_id')->unique())->get()->mapWithKeys(fn ($u) => [$u->id => $u->role]);

                return [
                    'cards' => [
                        ['label' => 'Total Appointments', 'value' => $rows->count(), 'icon' => 'calendar'],
                        ['label' => 'Present', 'value' => $present, 'icon' => 'check'],
                        ['label' => 'Absent', 'value' => $absent, 'icon' => 'x'],
                        ['label' => 'Not Marked', 'value' => $rows->count() - $marked, 'icon' => 'clock'],
                        ['label' => 'Attendance Rate', 'value' => $pct($present, $marked), 'hint' => 'of marked appointments', 'icon' => 'percent'],
                    ],
                    'charts' => [
                        ['title' => 'Appointments per Month', 'type' => 'line', 'data' => $this->countByMonth($rows->map(fn ($r) => $r->date_time_appoint ?? $r->confirmed_at)), 'wide' => true],
                        ['title' => 'Attendance', 'type' => 'doughnut', 'data' => array_values(array_filter([
                            ['label' => 'Present', 'value' => $present, 'color' => '#22c55e'],
                            ['label' => 'Absent', 'value' => $absent, 'color' => '#ef4444'],
                            ['label' => 'Not Marked', 'value' => $rows->count() - $marked, 'color' => '#9ca3af'],
                        ], fn ($d) => $d['value'] > 0))],
                        ['title' => 'Appointments by Day of the Week', 'type' => 'bar', 'data' => $this->countByWeekday($rows->map(fn ($r) => $r->date_time_appoint ?? $r->confirmed_at))],
                        ['title' => 'Appointments by Program', 'subtitle' => 'Students', 'type' => 'bar', 'data' => $this->countByProgram($rows->pluck('user_id')->filter(fn ($id) => ($roles[$id] ?? null) === 'student'))],
                        ['title' => 'With Whom', 'type' => 'doughnut', 'data' => $this->countBy($rows->map(fn ($r) => ucwords(str_replace('_', ' ', $roles[$r->user_id] ?? 'Other'))))],
                    ],
                ];

            case 'gatepass':
                $rows = $this->applyReportFilter(
                    GatePass::whereNotNull('confirmed_at'),
                    'confirmed_at'
                )->get(['id', 'user_id', 'allow_to', 'date_expiration', 'prefect_id', 'reason', 'confirmed_at']);
                $allowed = $rows->flatMap(fn ($r) => (array) (is_string($r->allow_to) ? json_decode($r->allow_to, true) : $r->allow_to))
                    ->map(fn ($v) => $v === 'go-out' ? 'Go Out' : ($v === 'enter' ? 'Enter' : ucfirst((string) $v)));
                $active = $rows->filter(fn ($r) => $r->date_expiration && now()->lt($r->date_expiration))->count();
                $byPrefect = $rows->whereNotNull('prefect_id')->count();
                $students = $rows->pluck('user_id');

                return [
                    'cards' => [
                        ['label' => 'Total Issued', 'value' => $rows->count(), 'icon' => 'door'],
                        ['label' => 'Active', 'value' => $active, 'icon' => 'check'],
                        ['label' => 'Expired', 'value' => $rows->count() - $active, 'icon' => 'clock'],
                        ['label' => 'Issued by Prefect', 'value' => $byPrefect, 'hint' => $pct($byPrefect, $rows->count()), 'icon' => 'user'],
                        ['label' => 'Requested by Students', 'value' => $rows->count() - $byPrefect, 'hint' => $pct($rows->count() - $byPrefect, $rows->count()), 'icon' => 'users'],
                    ],
                    'charts' => [
                        ['title' => 'Gate Passes per Month', 'type' => 'line', 'data' => $this->countByMonth($rows->pluck('confirmed_at')), 'wide' => true],
                        ['title' => 'Allowed To', 'type' => 'doughnut', 'data' => $this->countBy($allowed)],
                        ['title' => 'Reasons', 'subtitle' => 'Top 10', 'type' => 'hbar', 'data' => $this->countBy($rows->map(fn ($r) => ucfirst(trim((string) $r->reason)) ?: 'Not given'), 10)],
                        ['title' => 'Gate Passes by Program', 'type' => 'bar', 'data' => $this->countByProgram($students)],
                        ['title' => 'Gate Passes by Year Level', 'type' => 'bar', 'data' => $this->countByYearLevel($students)],
                    ],
                ];
        }

        return null;
    }

    // [['label' => ..., 'value' => n], ...], most frequent first.
    private function countBy($values, ?int $limit = null): array
    {
        $counts = collect($values)->countBy()->sortDesc();

        return ($limit ? $counts->take($limit) : $counts)
            ->map(fn ($n, $label) => ['label' => (string) $label, 'value' => $n])
            ->values()->all();
    }

    // Counts per program, by each person's latest enrollment (one entry per
    // record, so a student with 3 records counts 3 times).
    private function countByProgram($userIds): array
    {
        $ids = collect($userIds)->filter();
        if ($ids->isEmpty()) {
            return [];
        }

        $programOf = Enrollment::whereIn('id', Enrollment::whereIn('student_id', $ids->unique())->selectRaw('MAX(id)')->groupBy('student_id'))
            ->with('program:id,code')
            ->get(['id', 'student_id', 'program_id'])
            ->mapWithKeys(fn ($e) => [$e->student_id => $e->program?->code ?? 'No Program']);

        return $this->countBy($ids->map(fn ($id) => $programOf[$id] ?? 'Staff / Other'));
    }

    // Counts per calendar month, oldest first ("Jan 2026"), the months in
    // between included (zero), so a trend line has no gaps.
    private function countByMonth($dates): array
    {
        $months = collect($dates)->filter()->map(fn ($d) => Carbon::parse($d)->startOfMonth());
        if ($months->isEmpty()) {
            return [];
        }
        $counts = $months->countBy(fn ($d) => $d->format('Y-m'));
        $out = [];
        for ($c = $months->min()->copy(); $c->lte($months->max()); $c->addMonth()) {
            $out[] = ['label' => $c->format('M Y'), 'value' => (int) ($counts[$c->format('Y-m')] ?? 0)];
        }

        return $out;
    }

    // Counts per year level (latest enrollment), 1st to 4th Year.
    private function countByYearLevel($userIds): array
    {
        $ids = collect($userIds)->filter();
        if ($ids->isEmpty()) {
            return [];
        }
        $levelOf = Enrollment::whereIn('id', Enrollment::whereIn('student_id', $ids->unique())->selectRaw('MAX(id)')->groupBy('student_id'))
            ->pluck('year_level', 'student_id');
        $counts = $ids->map(fn ($id) => (int) ($levelOf[$id] ?? 0))->countBy();

        return collect([1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'])
            ->map(fn ($label, $level) => ['label' => $label, 'value' => (int) ($counts[$level] ?? 0)])
            ->values()->all();
    }

    // Counts by sex (profile), male / female (and "Not set").
    private function countBySex($userIds): array
    {
        $ids = collect($userIds)->filter();
        if ($ids->isEmpty()) {
            return [];
        }
        $sexOf = Profile::whereIn('user_id', $ids->unique())->pluck('sex', 'user_id');
        $counts = $ids->map(fn ($id) => $sexOf[$id] ?? 'u')->countBy();

        return array_values(array_filter([
            ['label' => 'Male', 'value' => (int) ($counts['m'] ?? 0), 'color' => '#3b82f6'],
            ['label' => 'Female', 'value' => (int) ($counts['f'] ?? 0), 'color' => '#ec4899'],
            ['label' => 'Not set', 'value' => (int) ($counts['u'] ?? 0), 'color' => '#9ca3af'],
        ], fn ($d) => $d['value'] > 0));
    }

    // Counts per day of the week, Monday first.
    private function countByWeekday($dates): array
    {
        $counts = collect($dates)->filter()->map(fn ($d) => Carbon::parse($d)->dayOfWeekIso)->countBy();
        if ($counts->isEmpty()) {
            return [];
        }

        return collect([1 => 'Mon', 2 => 'Tue', 3 => 'Wed', 4 => 'Thu', 5 => 'Fri', 6 => 'Sat', 7 => 'Sun'])
            ->map(fn ($label, $d) => ['label' => $label, 'value' => (int) ($counts[$d] ?? 0)])
            ->values()->all();
    }

    public function itrcIndex(string $section = 'statistics')
    {
        return list_page('super-admin/report', [
            'section' => $section,
            'students' => fn () => UserResource::collection(User::with(['profile', 'program', 'faculty.program', 'headships.program', 'parent'])->get()),
            // The Action Log table: loaded by the page from
            // /api/super-admin/report/action-log (every row, paginated in the browser).
            'action_log_list' => list_prop(fn () => $section === 'action-log' ? self::getAllActionLogs() : null),
            'statistics' => fn () => self::buildAccountStatistics('date', null, null, null, null),
            'school_years' => SchoolYearResource::collection(SchoolYear::orderByDesc('year')->get(['id', 'year'])),
        ]);
    }

    public function accountStatisticsPreview(Request $request)
    {
        return response()->json(self::buildAccountStatistics(
            $request->filter_by,
            $request->date_from,
            $request->date_to,
            $request->school_year_id,
            $request->semester
        ));
    }

    public function generateAccountStatisticsReport(Request $request)
    {
        GenerateAccountStatisticsReportJob::dispatch($request->all(), auth()->id());

        return response()->json(['message' => 'queued']);
    }

    /**
     * Super admin's own statistics domain: account/enrollment counts, not
     * the discipline data (complaints/referrals/absences/gate passes/
     * appointments) that belongs to the sub_admin's Analytical Report.
     *
     * "School Year" filters every role by their account's created_at
     * falling within that school year's calendar span (reusing
     * Report::resolveSchoolYearDates()) — the only school-year signal a
     * program_head/faculty/non_teaching_staff/parent account has. "Semester"
     * additionally narrows the student breakdown via a direct Enrollment
     * match (school_year_id + semester), since only students actually have
     * enrollment records — it has no effect on the other roles.
     */
    public static function buildAccountStatistics($filterBy, $dateFrom, $dateTo, $schoolYearId, $semester)
    {
        $from = $dateFrom;
        $to = $dateTo;

        // All School Years: no limit at all.
        $acrossYears = $filterBy === 'school_year' && (! $schoolYearId || $schoolYearId === 'all');
        if ($acrossYears) {
            $schoolYearId = null;
        } elseif (! $schoolYearId) {
            $semester = null;
        }

        if ($filterBy === 'school_year' && $schoolYearId) {
            $year = SchoolYear::where('id', $schoolYearId)->value('year');
            $resolved = Report::resolveSchoolYearDates(['school_year' => $year]);
            $from = $resolved['date_from'] ?? null;
            $to = $resolved['date_to'] ?? null;
        }

        $hasRange = $from && $to;

        $semesterAcross = $acrossYears && $semester ? $semester : null;

        $countByRole = fn ($role) => User::whereRole($role)
            ->when($hasRange, fn ($q) => $q->whereBetween('created_at', [$from, $to]))
            ->when($semesterAcross, fn ($q) => SchoolYearSemester::applyFilter($q, 'created_at', null, $semesterAcross))
            ->count();

        if ($filterBy === 'school_year' && ($schoolYearId || ($acrossYears && $semester))) {
            $studentQuery = Enrollment::query()
                ->when($schoolYearId, fn ($q) => $q->where('school_year_id', $schoolYearId))
                ->when($semester, fn ($q) => $q->where('semester', $semester));

            $studentCount = (clone $studentQuery)->distinct('student_id')->count('student_id');

            $studentsPerProgram = (clone $studentQuery)
                ->join('program', 'program.id', '=', 'enrollment.program_id')
                ->select('program.code as program', DB::raw('COUNT(DISTINCT enrollment.student_id) as total'))
                ->groupBy('program.code')
                ->orderByDesc('total')
                ->get();
        } else {
            $studentCount = $countByRole('student');

            $studentsPerProgram = User::whereRole('student')
                ->when($hasRange, fn ($q) => $q->whereBetween('created_at', [$from, $to]))
                ->with('program')
                ->get()
                ->groupBy(fn ($u) => $u->program?->code ?? 'Unassigned')
                ->map(fn ($group, $name) => ['program' => $name, 'total' => $group->count()])
                ->values();
        }

        return [
            'students' => $studentCount,
            'program_head' => $countByRole('program_head'),
            'faculty' => $countByRole('faculty'),
            'non_teaching_staff' => $countByRole('non_teaching_staff'),
            'parents' => $countByRole('parent'),
            'students_per_program' => $studentsPerProgram,
            'from' => $from,
            'to' => $to,
        ];
    }

    /**
     * Report generation is queued (GenerateReportJob) instead of running
     * inline: dompdf/PhpSpreadsheet rendering blocked the request for
     * every requester, and two prefects generating a report at the same
     * moment used to overwrite the same shared public_path() file.
     */
    public function store(Request $request)
    {
        GenerateReportJob::dispatch($request->all(), auth()->id());

        return response()->json(['message' => 'queued']);
    }

    public function generateAnalyticReport(Request $request)
    {
        GenerateReportJob::dispatch(array_merge($request->all(), ['type' => 'analytics']), auth()->id(), 'analytics');

        return response()->json(['message' => 'queued']);
    }

    /**
     * Lets the frontend warn "you already generated this" before queuing a
     * new job, instead of the prefect only finding out after it finishes.
     */
    public function checkDuplicateReport(Request $request)
    {
        $type = $request->type ?? 'incident';
        $fileType = $request->file_type ?? 'pdf';

        // Hash the raw filters (school_year, not a resolved date range) —
        // must match how GenerateReportJob hashes at dispatch time.
        $hash = Report::hashFilters($type, $fileType, $request->all());

        $existing = Report::where('user_id', auth()->id())
            ->where('filters_hash', $hash)
            ->latest('created_at')
            ->first();

        if (! $existing) {
            return response()->json(['exists' => false]);
        }

        return response()->json([
            'exists' => true,
            'report' => $existing,
            'download_url' => route('prefect.report.download', ['id' => encrypt_id($existing->id)]),
            'view_url' => $existing->file_type === 'pdf' ? route('prefect.report.view', ['id' => encrypt_id($existing->id)]) : null,
        ]);
    }

    /**
     * Saved report filters — a reusable preset (date range or school
     * year+semester, program/individual/type/file-type) that can be
     * generated repeatedly, edited, or deleted, instead of the old flow
     * where the "Generate Report" modal always produced a file right away.
     */
    public function reportFilterIndex()
    {
        return ReportFilterResource::collection(ReportFilter::where('user_id', auth()->id())
            ->latest('created_at')
            ->get());
    }

    public function storeReportFilter(Request $request)
    {
        $filters = $request->all();
        $type = $filters['type'] ?? 'incident';

        $filter = ReportFilter::create([
            'user_id' => auth()->id(),
            'report_type' => $type,
            'name' => $filters['report_name'] ?: (ucfirst($type).' Filter'),
            'filters' => $filters,
        ]);

        return response()->json(['filter' => $filter]);
    }

    public function updateReportFilterRequest(Request $request, $id)
    {
        $filter = ReportFilter::where('user_id', auth()->id())->findOrFail($id);

        // Only the period can change: by date range or by school year (either
        // one), and its dates or school year + semester. The report type,
        // scope (individual / program), sub-type, file type and name stay as
        // saved.
        $saved = $filter->filters ?? [];
        $bySchoolYear = $request->filled('school_year');
        $period = $request->validate($bySchoolYear
            ? ['school_year' => 'required|string|max:20', 'semester' => 'nullable|in:1,2']
            : ['date_from' => 'nullable|date', 'date_to' => 'nullable|date|after_or_equal:date_from']);

        $filter->update([
            'filters' => array_merge($saved, $bySchoolYear
                ? ['school_year' => $period['school_year'], 'semester' => $period['semester'] ?? '', 'date_from' => '', 'date_to' => '']
                : ['date_from' => $period['date_from'] ?? '', 'date_to' => $period['date_to'] ?? '', 'school_year' => '', 'semester' => '']),
        ]);

        return response()->json(['filter' => $filter]);
    }

    public function destroyReportFilter($id)
    {
        ReportFilter::where('user_id', auth()->id())->findOrFail($id)->delete();

        return response()->json(['message' => 'deleted']);
    }

    public function generateFromFilter(Request $request, $id)
    {
        $filter = ReportFilter::where('user_id', auth()->id())->findOrFail($id);

        // The file type is chosen per generation (the row's PDF / Excel
        // buttons), not saved with the filter. The Analytical Report is a
        // PDF only.
        $fileType = $request->validate([
            'file_type' => ['nullable', $filter->report_type === 'analytics' ? 'in:pdf' : 'in:pdf,excel'],
        ])['file_type'] ?? 'pdf';

        // Its progress is shown on the saved filter's row (track id).
        GenerateReportJob::dispatch(array_merge($filter->filters ?? [], ['file_type' => $fileType]), auth()->id(), "filter-{$filter->id}");

        return response()->json(['message' => 'queued', 'track_id' => "filter-{$filter->id}"]);
    }

    public function reportHistory()
    {
        return Report::where('user_id', auth()->id())
            ->latest('created_at')
            ->get()
            ->each(fn ($r) => $r->forceFill([
                'download_url' => route('prefect.report.download', ['id' => encrypt_id($r->id)]),
                'view_url' => $r->file_type === 'pdf' ? route('prefect.report.view', ['id' => encrypt_id($r->id)]) : null,
                'filters_summary' => $this->summarizeReportFilters($r->filters ?? [], $r->report_type),
            ]))
            ->pipe(fn ($reports) => ReportResource::collection($reports));
    }

    /**
     * The file name is no longer stored — it's always {id}-{report_type}-report.{ext}
     * (see GenerateReportJob::finalizeFileName / GenerateAccountStatisticsReportJob),
     * so downloadReport/viewReport/destroyReport rebuild it from the row alone.
     */
    private function reportFileName(Report $report): string
    {
        $ext = match ($report->file_type) {
            'excel' => 'xlsx',
            'word' => 'docx',
            default => 'pdf',
        };

        return "{$report->id}-{$report->report_type}-report.{$ext}";
    }

    /**
     * Human-readable recap of what a generated report was actually filtered
     * by, so the Generated Reports history lists the filters that produced
     * each file instead of just its file name/type — a prefect scanning the
     * list can tell two rows apart (and avoid re-generating the same thing)
     * without opening either file.
     */
    private static function semesterSuffix($semester): string
    {
        return match ((int) $semester) {
            1 => ' (1st Semester)',
            2 => ' (2nd Semester)',
            default => '',
        };
    }

    private function summarizeReportFilters(array $filters, string $reportType): string
    {
        $parts = [];

        if (! empty($filters['school_year'])) {
            $parts[] = ($filters['school_year'] === 'all'
                ? 'All School Years'
                : "SY {$filters['school_year']}").self::semesterSuffix($filters['semester'] ?? null);
        } elseif (! empty($filters['date_from']) && ! empty($filters['date_to'])) {
            $parts[] = Carbon::parse($filters['date_from'])->format('M j, Y').' – '.Carbon::parse($filters['date_to'])->format('M j, Y');
        }

        if ($reportType === 'analytics') {
            if ($studentId = self::analyticsStudentId($filters['student_id'] ?? null)) {
                $student = User::with('profile')->find($studentId);
                $parts[] = 'Student: '.trim(($student->profile->first_name ?? '').' '.($student->profile->last_name ?? ''));
            }

            return $parts ? implode(' • ', $parts) : 'All Time';
        }

        if (filter_var($filters['individual'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $student = User::with('profile')->find($filters['student_id'] ?? null);
            $name = $student ? trim(($student->profile->first_name ?? '').' '.($student->profile->last_name ?? '')) : null;
            $parts[] = 'Student: '.($name ?: 'Unknown');
        } elseif (! empty($filters['program']) && $filters['program'] !== 'all') {
            $parts[] = 'Program: '.(Program::find($filters['program'])->code ?? 'Unknown');
        } else {
            $parts[] = 'All Programs';
        }

        if (in_array($reportType, ['incident', 'violation']) && ! empty($filters['report_type']) && $filters['report_type'] !== 'all') {
            $label = Violation::find($filters['report_type'])?->violation_name;
            if ($label) {
                $parts[] = $label;
            }
        }

        return $parts ? implode(' • ', $parts) : 'All Records';
    }

    public function destroyReport($id)
    {
        $report = Report::where('user_id', auth()->id())->findOrFail($id);

        $path = storage_path('app/private/generated-reports/'.$this->reportRoleDir().'/'.auth()->id().'/'.$this->reportFileName($report));
        if (file_exists($path)) {
            unlink($path);
        }

        $report->delete();

        return response()->json(['message' => 'deleted']);
    }

    /**
     * JSON preview of the analytics tab for the selected date range, so the
     * on-screen charts/tables reflect the filter (previously only the PDF
     * export honored date_from/date_to). Accepts a "school_year" label the
     * same way GenerateReportJob does — resolveSchoolYearDates() turns it
     * into the equivalent date_from/date_to, so both filter modes share the
     * exact same downstream query logic.
     */
    public function analyticsPreview(Request $request)
    {
        return response()->json(self::analyticsFor($request));
    }

    /**
     * The Analytical Report's data for the request's filter (school_year /
     * semester, or date_from / date_to; none = all time, from the first
     * complaint up to now). Sent with the page itself (index(), section
     * "analytics"), so loading or refreshing it is no API call. The top
     * violators go through their Resource (only the fields the page shows).
     */
    public static function analyticsFor(Request $request): array
    {
        $filters = Report::resolveSchoolYearDates([
            'school_year' => $request->input('school_year'),
            'semester' => $request->input('semester'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ]);

        $from = $filters['date_from'] ?? null;
        $to = $filters['date_to'] ?? null;
        if (! $from || ! $to) {
            $from = Complaint::min('created_at') ?? now()->startOfYear();
            $to = now();
        }

        $data = self::buildAnalyticsData($from, $to, false, self::analyticsStudentId($request->input('student_id')));
        unset($data['incidentTrend']); // raw rows; the page uses the labels/series
        $data['top5Students'] = ComplaintSubjectViolationResource::collection($data['top5Students'])->resolve();

        return $data;
    }

    /**
     * The student an individual Analytical Report is about: only a student
     * (the filter's student search lists students only). The id arrives
     * already decrypted (DecryptEncryptedIds).
     */
    public static function analyticsStudentId($id): ?int
    {
        if (! is_numeric($id)) {
            return null;
        }

        return User::whereKey((int) $id)->whereRole('student')->exists() ? (int) $id : null;
    }

    /**
     * Drill-down behind one "Violations Per Program" row — same join/scope
     * as buildAnalyticsData()'s per-program subquery, just grouped by
     * student instead of collapsed to one program total, so the numbers
     * shown here always add up to the row the user clicked.
     */
    public function programViolationDetail(Request $request)
    {
        $request->validate([
            'program' => 'required|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        // Same join chain as buildAnalyticsData()'s per-program subquery,
        // but selecting the raw violation/complaint columns instead of
        // collapsing straight to a count. complaint_subject_violation has no
        // id column, so the rows are hydrated by hand below rather than via
        // an Eloquent whereIn('id', ...).
        $rows = DB::query()
            ->from('complaint_subject AS cs')
            ->join('complaint AS c', 'c.id', '=', 'cs.complaint_id')
            ->join('complaint_subject_violation AS cso', function ($join) {
                $join->on('cso.complaint_id', '=', 'cs.complaint_id')
                    ->on('cso.student_id', '=', 'cs.student_id');
            })
            ->join('enrollment AS e', function ($join) {
                $join->on('e.student_id', '=', 'cs.student_id')
                    ->where('e.status', '=', 'enrolled');
            })
            ->join('program AS p', 'p.id', '=', 'e.program_id')
            ->where('p.code', $request->program)
            ->when(
                $request->filled('date_from') && $request->filled('date_to'),
                fn ($q) => $q->whereBetween('c.created_at', [$request->date_from, $request->date_to])
            )
            ->select('cs.student_id', 'cso.violation_id', 'c.case_number', 'c.offense_issued_at')
            ->get();

        $users = User::with('profile')->whereIn('id', $rows->pluck('student_id')->unique())->get()
            ->each(fn ($u) => $u->encrypted_id = encrypt_id($u->id))
            ->keyBy('id');
        $violations = Violation::whereIn('id', $rows->pluck('violation_id')->filter()->unique())->get()->keyBy('id');

        $result = $rows->groupBy('student_id')->map(fn ($group, $studentId) => [
            'user' => UserResource::make($users->get($studentId)),
            'total_violations' => $group->count(),
            'violations' => $group->map(function ($row) use ($violations) {
                $violation = $violations->get($row->violation_id);

                return [
                    'violation_name' => $violation?->violation_name,
                    'offense_status' => $violation?->offense_status,
                    'case_number' => $row->case_number,
                    'offense_issued_at' => $row->offense_issued_at,
                ];
            })->values(),
        ])
            ->sortByDesc('total_violations')
            ->values();

        return response()->json([
            'program' => $request->program,
            'students' => $result,
            'students_with_violations' => $result->count(),
            'total_violations' => $result->sum('total_violations'),
        ]);
    }

    /**
     * Monthly incident counts broken down per incident type (Complaint's
     * incident_id, which points at a Violation) instead of one aggregate
     * line — capped to the busiest types in range, with the remainder
     * merged into "Other" so the chart stays readable regardless of how
     * many distinct types exist system-wide. Same chronological, gap-filled
     * month-walking as the aggregate trend above, just one series per type.
     */
    private static function incidentTrendSeries($from, $to, bool $excludePending = false, int $topN = 6, ?int $studentId = null): array
    {
        $rows = Complaint::selectRaw('YEAR(complaint.created_at) as year, MONTH(complaint.created_at) as month, violation.violation_name as type, COUNT(*) as total')
            ->join('violation', 'violation.id', '=', 'complaint.incident_id')
            ->whereBetween('complaint.created_at', [$from, $to])
            ->when($studentId, fn ($q) => $q->whereHas('complaintSubject', fn ($s) => $s->where('student_id', $studentId)))
            ->when($excludePending, fn ($q) => $q->whereNot('complaint.complaint_status', 'pending'))
            ->groupBy('year', 'month', 'type')
            ->get();

        $fromMonth = Carbon::parse($from)->startOfMonth();
        $toMonth = Carbon::parse($to)->startOfMonth();
        $spansMultipleYears = $fromMonth->year !== $toMonth->year;

        $labels = [];
        $monthIndex = [];
        $i = 0;
        for ($cursor = $fromMonth->copy(); $cursor->lte($toMonth); $cursor->addMonth(), $i++) {
            $labels[] = $spansMultipleYears ? $cursor->format("M 'y") : $cursor->format('M');
            $monthIndex["{$cursor->year}-{$cursor->month}"] = $i;
        }

        $totalsByType = $rows->groupBy('type')->map(fn ($group) => $group->sum('total'))->sortDesc();
        $topTypes = $totalsByType->take($topN)->keys()->all();
        $hasOther = $totalsByType->count() > count($topTypes);

        $series = [];
        foreach ($topTypes as $type) {
            $series[$type] = array_fill(0, count($labels), 0);
        }
        if ($hasOther) {
            $series['Other'] = array_fill(0, count($labels), 0);
        }

        foreach ($rows as $row) {
            $idx = $monthIndex["{$row->year}-{$row->month}"] ?? null;
            if ($idx === null) {
                continue;
            }
            $bucket = in_array($row->type, $topTypes, true) ? $row->type : 'Other';
            $series[$bucket][$idx] += $row->total;
        }

        return [
            'labels' => $labels,
            'series' => collect($series)->map(fn ($data, $type) => [
                'label' => $type,
                'data' => $data,
            ])->values()->all(),
        ];
    }

    /**
     * The Analytical Report's breakdowns, all within the same range
     * (complaint.created_at): violations by year level, severity, type and
     * sex; incidents by status and weekday; resolution rate and time; and
     * repeat offenders. A violation is a complaint_subject_violation row
     * with a violation set; a student's year level is their latest
     * enrollment's.
     */
    private static function analyticsBreakdowns($from, $to, int $incidentCount, int $resolved, ?int $studentId = null): array
    {
        // Individual report: that student's violations, and the complaints
        // they're a subject of.
        $violations = fn () => DB::table('complaint_subject_violation AS cso')
            ->join('complaint AS c', 'c.id', '=', 'cso.complaint_id')
            ->whereNotNull('cso.violation_id')
            ->whereBetween('c.created_at', [$from, $to])
            ->when($studentId, fn ($q) => $q->where('cso.student_id', $studentId));

        $latestEnrollment = DB::table('enrollment')->selectRaw('student_id, MAX(id) AS id')->groupBy('student_id');
        $byYearLevel = $violations()
            ->joinSub($latestEnrollment, 'le', 'le.student_id', '=', 'cso.student_id')
            ->join('enrollment AS e', 'e.id', '=', 'le.id')
            ->selectRaw('e.year_level AS level, COUNT(*) AS total')
            ->groupBy('e.year_level')
            ->pluck('total', 'level');
        $yearLabels = [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'];

        $bySeverity = $violations()
            ->join('violation AS v', 'v.id', '=', 'cso.violation_id')
            ->selectRaw('v.offense_status AS major, COUNT(*) AS total')
            ->groupBy('v.offense_status')
            ->pluck('total', 'major');

        $topTypes = $violations()
            ->join('violation AS v', 'v.id', '=', 'cso.violation_id')
            ->selectRaw('v.violation_name AS name, v.offense_status AS major, COUNT(*) AS total')
            ->groupBy('v.id', 'v.violation_name', 'v.offense_status')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['name' => ucwords(strtolower($r->name)), 'major' => (bool) $r->major, 'total' => (int) $r->total]);

        $bySex = $violations()
            ->leftJoin('profiles AS pr', 'pr.user_id', '=', 'cso.student_id')
            ->selectRaw("COALESCE(pr.sex, 'u') AS sex, COUNT(*) AS total")
            ->groupBy('sex')
            ->pluck('total', 'sex');

        // Per student: how many violations, for repeat offenders.
        $perStudent = $violations()
            ->selectRaw('cso.student_id, COUNT(*) AS total')
            ->groupBy('cso.student_id')
            ->pluck('total');
        $studentsWithViolations = $perStudent->count();
        $repeatOffenders = $perStudent->filter(fn ($n) => $n >= 2)->count();

        $complaints = fn () => Complaint::whereBetween('created_at', [$from, $to])
            ->when($studentId, fn ($q) => $q->whereHas('complaintSubject', fn ($s) => $s->where('student_id', $studentId)));
        $statusCounts = $complaints()->selectRaw('complaint_status AS status, COUNT(*) AS total')
            ->groupBy('complaint_status')->pluck('total', 'status');
        $statuses = ['pending', 'ongoing', 'resolved', 'rejected', 'revoked'];

        // MySQL DAYOFWEEK: 1 = Sunday ... 7 = Saturday.
        $byWeekday = $complaints()->selectRaw('DAYOFWEEK(created_at) AS d, COUNT(*) AS total')
            ->groupBy('d')->pluck('total', 'd');
        $weekdays = [2 => 'Mon', 3 => 'Tue', 4 => 'Wed', 5 => 'Thu', 6 => 'Fri', 7 => 'Sat', 1 => 'Sun'];

        $avgDays = $complaints()->where('complaint_status', 'resolved')->whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) / 24 AS days')
            ->value('days');

        return [
            'violationsByYearLevel' => collect($yearLabels)->map(fn ($label, $level) => ['label' => $label, 'total' => (int) ($byYearLevel[$level] ?? 0)])->values(),
            'violationsBySeverity' => [
                ['label' => 'Major', 'total' => (int) ($bySeverity[1] ?? 0)],
                ['label' => 'Minor', 'total' => (int) ($bySeverity[0] ?? 0)],
            ],
            'topViolationTypes' => $topTypes,
            'violationsBySex' => [
                ['label' => 'Male', 'total' => (int) ($bySex['m'] ?? 0)],
                ['label' => 'Female', 'total' => (int) ($bySex['f'] ?? 0)],
            ] + (($bySex['u'] ?? 0) ? [2 => ['label' => 'Not set', 'total' => (int) $bySex['u']]] : []),
            'complaintStatus' => collect($statuses)->map(fn ($st) => ['label' => ucfirst($st), 'status' => $st, 'total' => (int) ($statusCounts[$st] ?? 0)])->values(),
            'incidentsByWeekday' => collect($weekdays)->map(fn ($label, $d) => ['label' => $label, 'total' => (int) ($byWeekday[$d] ?? 0)])->values(),
            'resolutionRate' => $incidentCount ? round($resolved / $incidentCount * 100, 1) : 0,
            'avgResolutionDays' => $avgDays !== null ? round((float) $avgDays, 1) : null,
            'studentsWithViolations' => $studentsWithViolations,
            'repeatOffenders' => $repeatOffenders,
            'repeatRate' => $studentsWithViolations ? round($repeatOffenders / $studentsWithViolations * 100, 1) : 0,
        ];
    }

    /**
     * Individual Analytical Report: who the student is, and each of their
     * violations in the range (newest first).
     */
    private static function analyticsStudent(int $studentId, $from, $to): array
    {
        $user = User::with(['profile', 'program', 'enrollments'])->find($studentId);
        $p = $user?->profile;
        $level = (int) ($user?->enrollments?->sortByDesc('id')->first()->year_level ?? 0);

        $violations = DB::table('complaint_subject_violation AS cso')
            ->join('complaint AS c', 'c.id', '=', 'cso.complaint_id')
            ->join('violation AS v', 'v.id', '=', 'cso.violation_id')
            ->where('cso.student_id', $studentId)
            ->whereBetween('c.created_at', [$from, $to])
            ->orderByDesc('c.offense_issued_at')
            ->get(['v.violation_name', 'v.offense_status', 'c.case_number', 'c.complaint_number', 'c.offense_issued_at', 'c.created_at'])
            ->map(fn ($r) => [
                'name' => ucwords(strtolower($r->violation_name)),
                'major' => (bool) $r->offense_status,
                'case_number' => $r->case_number,
                'complaint_number' => $r->complaint_number,
                'issued_at' => $r->offense_issued_at ?? $r->created_at,
            ])->values();

        // Their violations per month (the range's months, gaps filled).
        $perMonth = $violations->countBy(fn ($v) => Carbon::parse($v['issued_at'])->format('Y-n'));
        $fromMonth = Carbon::parse($from)->startOfMonth();
        $toMonth = Carbon::parse($to)->startOfMonth();
        $multiYear = $fromMonth->year !== $toMonth->year;
        $trendLabels = [];
        $trendValues = [];
        for ($c = $fromMonth->copy(); $c->lte($toMonth); $c->addMonth()) {
            $trendLabels[] = $multiYear ? $c->format("M 'y") : $c->format('M');
            $trendValues[] = (int) ($perMonth["{$c->year}-{$c->month}"] ?? 0);
        }

        $byType = $violations->groupBy('name')
            ->map(fn ($g, $name) => ['name' => $name, 'major' => $g->first()['major'], 'total' => $g->count()])
            ->sortByDesc('total')->values();

        return [
            'encrypted_id' => encrypt_id($studentId),
            'total' => $violations->count(),
            'major' => $violations->where('major', true)->count(),
            'minor' => $violations->where('major', false)->count(),
            // Complaints they filed themselves (as complainant).
            'complaints_filed' => Complaint::where('complainant_id', $studentId)->whereBetween('created_at', [$from, $to])->count(),
            // Violation types committed more than once.
            'repeated_types' => $byType->filter(fn ($t) => $t['total'] >= 2)->count(),
            'by_type' => $byType,
            'trend_labels' => $trendLabels,
            'trend_values' => $trendValues,
            'name' => trim(preg_replace('/\s+/', ' ', ($p->first_name ?? '').' '.($p->middle_name ?? '').' '.($p->last_name ?? ''))),
            'id_number' => $user?->id_number,
            'program' => $user?->program?->code,
            'year_level' => [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'][$level] ?? null,
            // For the filter's selected-student chip after a refresh.
            'first_name' => $p?->first_name,
            'last_name' => $p?->last_name,
            'level' => $level ?: null,
            'profile_picture' => $p?->profile_picture,
            'sex' => $p?->sex,
            'violations' => $violations,
        ];
    }

    /**
     * Shared by the analytics PDF job and analyticsPreview(). $withChartImage
     * skips the quickchart.io round-trip for the on-screen preview, which
     * renders its own chart client-side.
     */
    public static function buildAnalyticsData($from, $to, $withChartImage = true, ?int $studentId = null)
    {
        // Individual report (one student): the complaints they're a subject
        // of and their own violations; no program / Top 5 rankings.
        $aboutStudent = fn ($q) => $q->when($studentId, fn ($qq) => $qq->whereHas('complaintSubject', fn ($s) => $s->where('student_id', $studentId)));

        // === Top 5 Students ===
        $top5Students = ComplaintSubjectViolation::select(
            'student_id',
            DB::raw('COUNT(*) as total_offenses')
        )
            ->with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereHas('complaint', function ($q) use ($from, $to) {
                $q->where('complaint_status', 'resolved')->whereBetween('created_at', [$from, $to]);
            })
            ->where(function ($q) {
                $q->whereNotNull('violation_id');
            })
            ->groupBy('student_id')
            ->orderByRaw('COUNT(*) DESC')
            ->take(5)
            ->get()
            ->each(fn ($s) => $s->user->encrypted_id = encrypt_id($s->user->id));
        if ($studentId) {
            $top5Students = collect();
        }

        // === Violations Per Program ===
        $violationPerProgram = DB::query()
            ->fromSub(function ($q) use ($from, $to) {

                // 🔹 Count violations PER STUDENT first
                $q->from('complaint_subject AS cs')
                    ->join('complaint AS c', 'c.id', '=', 'cs.complaint_id')
                    ->join('complaint_subject_violation AS cso', function ($join) {
                        $join->on('cso.complaint_id', '=', 'cs.complaint_id')
                            ->on('cso.student_id', '=', 'cs.student_id');
                    })
                    ->join('enrollment AS e', function ($join) {
                        $join->on('e.student_id', '=', 'cs.student_id')
                            ->where('e.status', '=', 'enrolled');
                    })
                    ->join('program AS p', 'p.id', '=', 'e.program_id')
                    ->whereBetween('c.created_at', [$from, $to])
                    ->select(
                        'p.code AS program',
                        'cs.student_id',
                        DB::raw('COUNT(*) AS student_violations')
                    )
                    ->groupBy('p.code', 'cs.student_id');

            }, 'student_counts')
            ->select(
                'program',

                // ✅ unique students with violations
                DB::raw('COUNT(student_id) AS students_with_violations'),

                // ✅ total = SUM of each student's violations (NO DISTINCT)
                DB::raw('SUM(student_violations) AS total_violations')
            )
            ->groupBy('program')
            ->orderByDesc('total_violations')
            ->get();
        if ($studentId) {
            $violationPerProgram = collect();
        }

        // === Summary Data ===

        $totalViolations = ComplaintSubjectViolation::with('complaint')
            ->whereHas('complaint', fn ($q) => $q->whereBetween('offense_issued_at', [$from, $to]))
            ->when($studentId, fn ($q) => $q->where('student_id', $studentId))
            ->count();

        $resolved = $aboutStudent(Complaint::where('complaint_status', 'resolved')
            ->whereBetween('created_at', [$from, $to]))
            ->count();

        $incidentCount = $aboutStudent(Complaint::whereBetween('created_at', [$from, $to]))->count();

        // === Incident Trend (Monthly) ===
        // Grouping by MONTH() alone (the old approach) merges same-numbered
        // months from different years into one bucket and orders them 1-12
        // instead of chronologically — badly wrong for any range spanning
        // more than a year. Grouping by year+month and walking every month
        // in the range (filling in zero-count gaps) keeps the line
        // chronological and evenly spaced even where a month had no
        // incidents at all.
        $incidentTrend = $aboutStudent(Complaint::selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as total')
            ->whereBetween('created_at', [$from, $to]))
            ->groupBy('year', 'month')
            ->get()
            ->keyBy(fn ($row) => "{$row->year}-{$row->month}");

        $fromMonth = Carbon::parse($from)->startOfMonth();
        $toMonth = Carbon::parse($to)->startOfMonth();
        $spansMultipleYears = $fromMonth->year !== $toMonth->year;

        $labels = [];
        $values = [];
        for ($cursor = $fromMonth->copy(); $cursor->lte($toMonth); $cursor->addMonth()) {
            $labels[] = $spansMultipleYears ? $cursor->format("M 'y") : $cursor->format('M');
            $values[] = (int) ($incidentTrend->get("{$cursor->year}-{$cursor->month}")->total ?? 0);
        }

        $incidentTrendByType = self::incidentTrendSeries($from, $to, studentId: $studentId);

        $data = [
            'from' => $from,
            'to' => $to,
            'top5Students' => $top5Students,
            'violationPerProgram' => $violationPerProgram,
            'incidentTrend' => $incidentTrend,
            'incidentTrendLabels' => $labels,
            'incidentTrendValues' => $values,
            'incidentTrendSeries' => $incidentTrendByType['series'],
            'totalViolations' => $totalViolations,
            'resolved' => $resolved,
            'incidentCount' => $incidentCount,
        ] + self::analyticsBreakdowns($from, $to, $incidentCount, $resolved, $studentId)
          + ['student' => $studentId ? self::analyticsStudent($studentId, $from, $to) : null];

        if (! $withChartImage) {
            return $data;
        }

        // Build chart config
        $chartConfig = [
            'type' => 'line',
            'data' => [
                'labels' => $labels,
                'datasets' => [[
                    'label' => 'Monthly Incidents',
                    'data' => $values,
                    'borderColor' => '#1a237e',
                    'backgroundColor' => 'rgba(26,35,126,0.1)',
                    'fill' => true,
                    'tension' => 0.3,
                ]],
            ],
            'options' => [
                'plugins' => [
                    'legend' => ['display' => true],
                ],
                'scales' => [
                    'y' => ['beginAtZero' => true],
                ],
            ],
        ];

        // Fetch image as base64
        $chartResponse = Http::withOptions(['verify' => false])
            ->get('https://quickchart.io/chart', ['c' => json_encode($chartConfig)]);
        $data['chartBase64'] = 'data:image/png;base64,'.base64_encode($chartResponse->body());

        return $data;
    }

    /**
     * Streams a report file generated by GenerateReportJob back to the
     * requester. Files live under a per-user folder, so this doubles as the
     * authorization check.
     */
    public function downloadReport($id)
    {
        $id = decrypt_id($id) ?? abort(404);
        $report = Report::where('user_id', auth()->id())->findOrFail($id);
        $fileName = $this->reportFileName($report);
        $path = storage_path('app/private/generated-reports/'.$this->reportRoleDir().'/'.auth()->id()."/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        // No deleteFileAfterSend — the report is kept on disk so it stays
        // downloadable/viewable from the Generated Reports history until
        // the prefect explicitly deletes it (destroyReport()).
        // Saved under a readable name (Report::readableFileName()).
        return response()->download($path, $report->readableFileName(), [
            'Content-Type' => mime_content_type($path),
        ]);
    }

    /**
     * Inline preview (no Content-Disposition: attachment) — PDFs only, the
     * frontend doesn't offer this for Excel since browsers can't render it.
     */
    public function viewReport($id)
    {
        $id = decrypt_id($id) ?? abort(404);
        $report = Report::where('user_id', auth()->id())->findOrFail($id);
        $fileName = $this->reportFileName($report);
        $path = storage_path('app/private/generated-reports/'.$this->reportRoleDir().'/'.auth()->id()."/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        // Inline, under its readable name (the tab title and "Save as").
        $name = $report->readableFileName();

        return response()->file($path, [
            'Content-Type' => mime_content_type($path),
            'Content-Disposition' => \Symfony\Component\HttpFoundation\HeaderUtils::makeDisposition(
                'inline', $name, \Illuminate\Support\Str::ascii($name)
            ),
        ]);
    }

    /**
     * ActionLog::log() stores a field-level before/after diff as JSON
     * (see ActionLog::detailsParsed()) — this turns that back into a
     * readable "Summary — Field: old → new" line for the action log
     * report; a plain-sentence row (login, a brand-new record with no
     * "previous" version, or any not-yet-converted call site) round-trips
     * unchanged.
     */
    private function formatActionLogDetails(?string $details): string
    {
        $decoded = json_decode($details ?? '', true);

        if (! is_array($decoded) || ! array_key_exists('summary', $decoded)) {
            return ucwords($details ?? '');
        }

        $changes = collect($decoded['changes'] ?? [])
            ->map(fn ($change, $field) => ucwords(str_replace('_', ' ', $field)).": {$change['from']} \u{2192} {$change['to']}")
            ->values()
            ->implode('; ');

        $summary = ucwords($decoded['summary']);

        return $changes ? "{$summary} \u{2014} {$changes}" : $summary;
    }

    public function actionLogStore(Request $request)
    {
        $query = ActionLog::with('user.profile');

        // 🔹 Apply filters
        if ($request->report_type != 'all') {
            $query->where('action_type', $request->report_type);
        }
        $individual = (filter_var(request()->individual, FILTER_VALIDATE_BOOLEAN)) ? 1 : 0;

        if ($individual == 1) {
            $query->where('user_id', $request->user_id);
        }

        $range = $this->resolveActionLogRange($request);
        $this->applyActionLogRange($query, $range);

        $logs = $query->latest('created_at');
        $data = [];
        $collection = [];
        if ($individual != 1) {
            $i = 0;
            foreach ($logs->get()->toArray() as $l) {
                $profile = $l['user']['profile'] ?? [];
                $name = ($profile['first_name'] ?? '').' '.($profile['middle_name'] ?? '').' '.($profile['last_name'] ?? '');
                $collection[] = ($request->file_type == 'excel')
                ?
                [
                    $i + 1,
                    ucwords($l['user']['id_number'] ?? ''),
                    ucwords($name),
                    ucwords($l['user']['role'] ?? ''),
                    ucwords($l['action_type']),
                    $this->formatActionLogDetails($l['details']),
                    Carbon::parse($l['created_at'])->format('F j, Y g:i A'),
                ]
                :
                [
                    'i' => $i + 1,
                    'user_id' => ucwords($l['user']['id_number'] ?? ''),
                    'name' => ucwords($name),
                    'role' => ucwords($l['user']['role'] ?? ''),
                    'action_type' => ucwords($l['action_type']),
                    'details' => $this->formatActionLogDetails($l['details']),
                    'date_time' => Carbon::parse($l['created_at'])->format('F j, Y g:i A'),
                ];
                $i++;
            }
            $data = [
                'data' => $collection,
                'period' => $range['label'],
            ];
        } else {
            $i = 0;
            $user = User::with('profile')->findOrFail($request->user_id)->toArray();
            $userProfile = $user['profile'] ?? [];
            foreach ($logs->get()->toArray() as $l) {
                $collection[] = ($request->file_type == 'excel')
                ?
                [
                    $i + 1,
                    ucwords($l['action_type']),
                    $this->formatActionLogDetails($l['details']),
                    Carbon::parse($l['created_at'])->format('F j, Y g:i A'),
                ]
                :
                [
                    'i' => $i + 1,
                    'action_type' => ucwords($l['action_type']),
                    'details' => $this->formatActionLogDetails($l['details']),
                    'date_time' => Carbon::parse($l['created_at'])->format('F j, Y g:i A'),
                ];
                $i++;
            }
            $data = [
                'data' => $collection,
                'period' => $range['label'],
                'id' => ucwords($user['id_number'] ?? ''),
                'name' => ucwords(($userProfile['first_name'] ?? '').' '.($userProfile['middle_name'] ?? '').' '.($userProfile['last_name'] ?? '')),
                'role' => ucwords($user['role'] ?? ''),
                'civil_status' => ucwords($userProfile['civil_status'] ?? ''),
                'profile_picture' => Storage::disk('public')->path("profile-pictures/{$userProfile['profile_picture']}"),
            ];
        }

        // choose file pdf or excel
        // /generate the report
        // self::getActionLogFileType($request->file_type, $request->individual, $data)
        return self::getActionLogFileType($request->file_type, ($individual == 1), $data);
    }

    public function getActionLogFileType($type, $individual, $data)
    {
        switch ($type) {
            case 'pdf':
                $file = ($individual) ? 'individual-action-log-report' : 'action-log-report';
                $name = $individual
                    ? 'user-action-log-'.$data['id'].'-'.now()->format('Ymd-His').'.pdf'
                    : 'action-log-all-'.now()->format('Ymd-His').'.pdf';

                // Shown in the browser tab it was opened in (not downloaded),
                // and streamed: no shared file left in public/.
                return Pdf::loadView("pdf.reports.$file", $data)->stream($name);
            case 'excel':
                $fileName = $individual
                   ? 'user-action-log-'.$data['id'].'-'.now()->format('Ymd-His').'.xlsx'
                   : 'action-log-all-'.now()->format('Ymd-His').'.xlsx';

                return Excel::download(new ActionLogReportExport($data, $individual), $fileName);
        }
    }

    public function update(Request $request)
    {
        Report::where('id', $request->id)->update([]);

        return response()->json(self::getAllReport());
    }

    public static function getAllReport($type = 'incident')
    {
        $data = ($type == 'incident')
                ? new ComplaintSubject
                : new ComplaintSubjectViolation;

        $data = $data->with([
            'user.profile',
            'user.program',
            'user.enrollments',
            'user.faculty.program', 'user.headships.program',
            'violation',
            'complaint.user',
            'complaint.violation',
        ])
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved')
                    ->latest('created_at');
            });
        $data = $type == 'incident' ? $data->distinct('student_id') : $data->whereHas('violation', function ($q) {
            $q->whereNot('violation_name', null);
        })->distinct('student_id');

        return $data;
    }

    public function getAllActionLogs()
    {
        $query = ActionLog::with('user.profile')->latest('created_at');

        if (request('action_type') && request('action_type') !== 'all') {
            $query->where('action_type', request('action_type'));
        }

        $this->applyActionLogRange($query, $this->resolveActionLogRange(request()));

        // Every row (the table paginates in the browser), as { data: [...] }.
        return ['data' => ActionLogResource::collection($query->get())];
    }

    /**
     * Turns either filter mode (filter_by=date with date_from/date_to, or
     * filter_by=school_year with school_year_id + optional semester) into
     * one from/to window plus a human-readable label for the report header.
     */
    private function resolveActionLogRange(Request $request): array
    {
        $from = null;
        $to = null;
        $label = null;

        $semesterAcross = null;

        if ($request->filter_by === 'school_year' && (! $request->filled('school_year_id') || $request->school_year_id === 'all')) {
            $semesterAcross = in_array((int) $request->semester, [1, 2], true) ? (int) $request->semester : null;
            $label = 'All School Years'.match ($semesterAcross) {
                1 => ' (1st Semester)',
                2 => ' (2nd Semester)',
                default => '',
            };
        } elseif ($request->filter_by === 'school_year') {
            $year = $request->filled('school_year_id')
                ? SchoolYear::where('id', $request->school_year_id)->value('year')
                : null;

            if ($year) {
                $resolved = Report::resolveSchoolYearDates([
                    'school_year' => $year,
                    'semester' => $request->semester,
                ]);
                $from = $resolved['date_from'] ?? null;
                $to = $resolved['date_to'] ?? null;
                $semesterLabel = match ((int) $request->semester) {
                    1 => ' (1st Semester)',
                    2 => ' (2nd Semester)',
                    default => '',
                };
                $label = "School Year {$year}{$semesterLabel}";
            }
        } else {
            $from = $request->date_from ?: null;
            $to = $request->date_to ?: null;
        }

        $from = $from ? Carbon::parse($from)->startOfDay() : null;
        $to = $to ? Carbon::parse($to)->endOfDay() : null;

        if (! $label) {
            $label = match (true) {
                $from && $to => 'From '.$from->format('F d, Y').' to '.$to->format('F d, Y'),
                (bool) $from => 'From '.$from->format('F d, Y').' onwards',
                (bool) $to => 'Up to '.$to->format('F d, Y'),
                default => 'All Dates',
            };
        }

        return ['from' => $from, 'to' => $to, 'label' => $label, 'semester' => $semesterAcross];
    }

    private function applyActionLogRange($query, array $range): void
    {
        $query->when($range['from'], fn ($q) => $q->where('created_at', '>=', $range['from']))
            ->when($range['to'], fn ($q) => $q->where('created_at', '<=', $range['to']))
            ->when($range['semester'] ?? null, fn ($q) => SchoolYearSemester::applyFilter($q, 'created_at', null, $range['semester']));
    }

    public function getReportField($request)
    {
        return [
            'prefect_id' => auth()->user()->id,
            'report_name' => $request->report_name,
            'report_type' => $request->report_type,
            'date_from' => $request->date_from,
            'date_to' => $request->date_to,
            'file_type' => $request->file_type,
            'description' => $request->description,
        ];
    }
}
