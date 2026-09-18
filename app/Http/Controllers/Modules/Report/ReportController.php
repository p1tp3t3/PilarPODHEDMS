<?php

namespace App\Http\Controllers\Modules\Report;

use App\Exports\ActionLogReportExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActionLogResource;
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
use App\Models\Program;
use App\Models\Report;
use App\Models\ReportFilter;
use App\Models\SchoolYear;
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

class ReportController extends Controller
{
    /**
     * Shared "Date Range" / "School Year" filter for the whole prefect
     * Report page — one filter card in report.jsx covers every tab instead
     * of each report list having its own copy. Date Range narrows by a raw
     * timestamp column (the caller passes which one); School Year narrows
     * by the record's own `school_year_semester_id` tag (exact, since it's
     * stamped at filing time) rather than a guessed calendar span, and
     * "semester" further narrows within that school year when picked.
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
        } elseif ($filterBy === 'school_year' && $schoolYearId) {
            $constrain = fn ($q) => $q->whereHas('schoolYearSemester', function ($sq) use ($schoolYearId, $semester) {
                $sq->where('school_year_id', $schoolYearId);
                if ($semester) {
                    $sq->where('semester', $semester);
                }
            });
        }

        if (! $constrain) {
            return $query;
        }

        return $relation ? $query->whereHas($relation, $constrain) : $constrain($query);
    }

    public function index()
    {
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
            ->get();

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
                        'p.name AS program',
                        'cs.student_id',
                        DB::raw('COUNT(*) AS student_violations')
                    )
                    ->groupBy('p.name', 'cs.student_id');

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
            'user' => auth()->user(),
            'incident' => $incident,
            'incident_line_graph' => $monthlyCounts,
            'incident_trend_series' => $incidentTrendByType['series'],
            'incident_trend_labels' => $incidentTrendByType['labels'],
            'resolution' => 0,
            'resolved' => $resolved,
            'violation_count' => $violationCount,
            'top5_students' => $top5Students,
            'report' => $this->applyReportFilter(self::getAllReport(), 'created_at', 'complaint')
                ->orderByDesc(
                    Complaint::select('created_at')
                        ->whereColumn('complaint.id', 'complaint_subject.complaint_id')
                )
                ->paginate(request('report_per_page', 20), ['*'], 'report_page'),
            'violation_report' => $this->applyReportFilter(self::getAllReport('violation'), 'offense_issued_at', 'complaint')
                ->orderByDesc(
                    Complaint::select('offense_issued_at')
                        ->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id')
                )
                ->paginate(20),
            'violation_list' => $violation,
            'incident_list' => $incidentList,
            'programs' => Program::all(['id', 'name']),
            'students' => User::with(['profile', 'program'])->where('role', 'student')->get(),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'school_years_full' => SchoolYear::orderByDesc('year')->get(['id', 'year']),
            'violation_program' => $data,
            'tardy_report' => $this->applyReportFilter(
                Absence::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->whereNotNull('confirmed_at')
                    ->whereJsonContains('reason', 'Excused Tardiness'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get(),
            'appointment_report' => $this->applyReportFilter(
                Appointment::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->where('appointment_status', 'accepted'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get(),
            'gatepass_report' => $this->applyReportFilter(
                GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
                    ->whereNotNull('confirmed_at'),
                'confirmed_at'
            )
                ->latest('confirmed_at')
                ->get(),
        ]);
    }

    public function itrcIndex()
    {
        return Inertia::render('itrc/report', [
            'user' => auth()->user(),
            'students' => User::with(['profile', 'program', 'teachingStaff.program', 'parent'])->get(),
            'action_log_list' => self::getAllActionLogs(),
            'statistics' => self::buildAccountStatistics('date', null, null, null, null),
            'school_years' => SchoolYear::orderByDesc('year')->get(['id', 'year']),
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
     * teaching_staff/non_teaching_staff/parent account has. "Semester"
     * additionally narrows the student breakdown via a direct Enrollment
     * match (school_year_id + semester), since only students actually have
     * enrollment records — it has no effect on the other roles.
     */
    public static function buildAccountStatistics($filterBy, $dateFrom, $dateTo, $schoolYearId, $semester)
    {
        $from = $dateFrom;
        $to = $dateTo;

        if ($filterBy === 'school_year' && $schoolYearId) {
            $year = SchoolYear::where('id', $schoolYearId)->value('year');
            $resolved = Report::resolveSchoolYearDates(['school_year' => $year]);
            $from = $resolved['date_from'] ?? null;
            $to = $resolved['date_to'] ?? null;
        }

        $hasRange = $from && $to;

        $countByRole = fn ($role) => User::where('role', $role)
            ->when($hasRange, fn ($q) => $q->whereBetween('created_at', [$from, $to]))
            ->count();

        if ($filterBy === 'school_year' && $schoolYearId) {
            $studentQuery = Enrollment::where('school_year_id', $schoolYearId)
                ->when($semester, fn ($q) => $q->where('semester', $semester));

            $studentCount = (clone $studentQuery)->distinct('student_id')->count('student_id');

            $studentsPerProgram = (clone $studentQuery)
                ->join('program', 'program.id', '=', 'enrollment.program_id')
                ->select('program.name as program', DB::raw('COUNT(DISTINCT enrollment.student_id) as total'))
                ->groupBy('program.name')
                ->orderByDesc('total')
                ->get();
        } else {
            $studentCount = $countByRole('student');

            $studentsPerProgram = User::where('role', 'student')
                ->when($hasRange, fn ($q) => $q->whereBetween('created_at', [$from, $to]))
                ->with('program')
                ->get()
                ->groupBy(fn ($u) => $u->program?->name ?? 'Unassigned')
                ->map(fn ($group, $name) => ['program' => $name, 'total' => $group->count()])
                ->values();
        }

        return [
            'students' => $studentCount,
            'teaching_staff' => $countByRole('teaching_staff'),
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
        GenerateReportJob::dispatch(array_merge($request->all(), ['type' => 'analytics']), auth()->id());

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
            'download_url' => route('prefect.report.download', ['id' => $existing->id]),
            'view_url' => $existing->file_type === 'pdf' ? route('prefect.report.view', ['id' => $existing->id]) : null,
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
        return ReportFilter::where('user_id', auth()->id())
            ->latest('created_at')
            ->get();
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

        $filters = $request->all();
        $type = $filters['type'] ?? $filter->report_type;

        $filter->update([
            'report_type' => $type,
            'name' => $filters['report_name'] ?: (ucfirst($type).' Filter'),
            'filters' => $filters,
        ]);

        return response()->json(['filter' => $filter]);
    }

    public function destroyReportFilter($id)
    {
        ReportFilter::where('user_id', auth()->id())->findOrFail($id)->delete();

        return response()->json(['message' => 'deleted']);
    }

    public function generateFromFilter($id)
    {
        $filter = ReportFilter::where('user_id', auth()->id())->findOrFail($id);

        GenerateReportJob::dispatch($filter->filters, auth()->id());

        return response()->json(['message' => 'queued']);
    }

    public function reportHistory()
    {
        return Report::where('user_id', auth()->id())
            ->latest('created_at')
            ->get()
            ->map(fn ($r) => array_merge($r->toArray(), [
                'download_url' => route('prefect.report.download', ['id' => $r->id]),
                'view_url' => $r->file_type === 'pdf' ? route('prefect.report.view', ['id' => $r->id]) : null,
                'filters_summary' => $this->summarizeReportFilters($r->filters ?? [], $r->report_type),
            ]));
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
    private function summarizeReportFilters(array $filters, string $reportType): string
    {
        $parts = [];

        if (! empty($filters['school_year'])) {
            $parts[] = "SY {$filters['school_year']}";
        } elseif (! empty($filters['date_from']) && ! empty($filters['date_to'])) {
            $parts[] = Carbon::parse($filters['date_from'])->format('M j, Y').' – '.Carbon::parse($filters['date_to'])->format('M j, Y');
        }

        if ($reportType === 'analytics') {
            return $parts ? implode(' • ', $parts) : 'All Time';
        }

        if (filter_var($filters['individual'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $student = User::with('profile')->find($filters['student_id'] ?? null);
            $name = $student ? trim(($student->profile->first_name ?? '').' '.($student->profile->last_name ?? '')) : null;
            $parts[] = 'Student: '.($name ?: 'Unknown');
        } elseif (! empty($filters['program']) && $filters['program'] !== 'all') {
            $parts[] = 'Program: '.(Program::find($filters['program'])->name ?? 'Unknown');
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
        $filters = Report::resolveSchoolYearDates([
            'school_year' => $request->input('school_year'),
            'semester' => $request->input('semester'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ]);

        return response()->json(
            self::buildAnalyticsData($filters['date_from'] ?? null, $filters['date_to'] ?? null, false)
        );
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
            ->where('p.name', $request->program)
            ->when(
                $request->filled('date_from') && $request->filled('date_to'),
                fn ($q) => $q->whereBetween('c.created_at', [$request->date_from, $request->date_to])
            )
            ->select('cs.student_id', 'cso.violation_id', 'c.case_number', 'c.offense_issued_at')
            ->get();

        $users = User::with('profile')->whereIn('id', $rows->pluck('student_id')->unique())->get()->keyBy('id');
        $violations = Violation::whereIn('id', $rows->pluck('violation_id')->filter()->unique())->get()->keyBy('id');

        $result = $rows->groupBy('student_id')->map(fn ($group, $studentId) => [
            'user' => $users->get($studentId),
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
    private static function incidentTrendSeries($from, $to, bool $excludePending = false, int $topN = 6): array
    {
        $rows = Complaint::selectRaw('YEAR(complaint.created_at) as year, MONTH(complaint.created_at) as month, violation.violation_name as type, COUNT(*) as total')
            ->join('violation', 'violation.id', '=', 'complaint.incident_id')
            ->whereBetween('complaint.created_at', [$from, $to])
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
     * Shared by the analytics PDF job and analyticsPreview(). $withChartImage
     * skips the quickchart.io round-trip for the on-screen preview, which
     * renders its own chart client-side.
     */
    public static function buildAnalyticsData($from, $to, $withChartImage = true)
    {
        // === Top 5 Students ===
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
            ->get();

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
                        'p.name AS program',
                        'cs.student_id',
                        DB::raw('COUNT(*) AS student_violations')
                    )
                    ->groupBy('p.name', 'cs.student_id');

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

        // === Summary Data ===

        $totalViolations = ComplaintSubjectViolation::with('complaint')
            ->whereHas('complaint', fn ($q) => $q->whereBetween('offense_issued_at', [$from, $to]))
            ->count();

        $resolved = Complaint::where('complaint_status', 'resolved')
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $incidentCount = Complaint::whereBetween('created_at', [$from, $to])->count();

        // === Incident Trend (Monthly) ===
        // Grouping by MONTH() alone (the old approach) merges same-numbered
        // months from different years into one bucket and orders them 1-12
        // instead of chronologically — badly wrong for any range spanning
        // more than a year. Grouping by year+month and walking every month
        // in the range (filling in zero-count gaps) keeps the line
        // chronological and evenly spaced even where a month had no
        // incidents at all.
        $incidentTrend = Complaint::selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as total')
            ->whereBetween('created_at', [$from, $to])
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

        $incidentTrendByType = self::incidentTrendSeries($from, $to);

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
        ];

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
        $report = Report::where('user_id', auth()->id())->findOrFail($id);
        $fileName = $this->reportFileName($report);
        $path = storage_path('app/private/generated-reports/'.$this->reportRoleDir().'/'.auth()->id()."/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        // No deleteFileAfterSend — the report is kept on disk so it stays
        // downloadable/viewable from the Generated Reports history until
        // the prefect explicitly deletes it (destroyReport()).
        return response()->download($path, $fileName, [
            'Content-Type' => mime_content_type($path),
        ]);
    }

    /**
     * Inline preview (no Content-Disposition: attachment) — PDFs only, the
     * frontend doesn't offer this for Excel since browsers can't render it.
     */
    public function viewReport($id)
    {
        $report = Report::where('user_id', auth()->id())->findOrFail($id);
        $fileName = $this->reportFileName($report);
        $path = storage_path('app/private/generated-reports/'.$this->reportRoleDir().'/'.auth()->id()."/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => mime_content_type($path),
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

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

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
                'from' => $request->date_from,
                'to' => $request->date_to,
            ];
        } else {
            $i = 0;
            $user = $logs->first()->toArray()['user'];
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
                'from' => $request->date_from,
                'to' => $request->date_to,
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
                $output = public_path('action-log-report.pdf');
                $pdf = Pdf::loadView("pdf.reports.$file", $data);
                $pdf->save($output);

                return response()->download($output)->deleteFileAfterSend(true);
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
            'user.teachingStaff.program',
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

        // Filter by date or date range
        if (request()->filled('date')) {
            // Single date filter
            $query->whereDate('created_at', request('date'));
        }

        return ActionLogResource::collection($query->paginate(100));
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
