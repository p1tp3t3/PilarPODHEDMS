<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Modules\Appointment\AppointmentController;
use App\Models\Absence;
use App\Models\ActionLog;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\Enrollment;
use App\Models\FamilyMember;
use App\Models\GatePass;
use App\Models\NonTeachingStaff;
use App\Models\Penalty;
use App\Models\Program;
use App\Models\Referral;
use App\Models\SchoolYearSemester;
use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\Violation\ViolationResource;
use App\Http\Resources\Violation\PenaltyResource;
use App\Http\Resources\System\SchoolYearResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\Referral\ReferralResource;
use App\Http\Resources\AbsentForm\AbsenceResource;
use App\Http\Resources\GatePass\GatePassResource;
use App\Http\Resources\Appointment\AppointmentResource;
use App\Http\Resources\System\ProgramResource;

class DashboardController extends Controller
{
    public function index()
    {
        switch (auth()->user()->role) {
            case 'super_admin':
                return self::itrcDashboard();
            case 'sub_admin':
                return self::prefectDashboard();
            case 'student':
                return self::studentDashboard();
            case 'program_head':
            case 'faculty':
                return self::teacherDashboard();
            case 'non_teaching_staff':
                // "Guard" and "Guidance" aren't separate roles — they're
                // positions inside non_teaching_staff, each with their own
                // dashboard.
                return self::isGuidance() ? self::guidanceDashboard() : self::nonTeachingStaffDashboard();
            case 'parent':
                return self::parentDashboard();
        }
    }

    private function isGuidance()
    {
        return NonTeachingStaff::where('user_id', auth()->id())->first()?->position === 'Guidance';
    }

    private function isGuard()
    {
        return NonTeachingStaff::where('user_id', auth()->id())->first()?->position === 'Guard';
    }

    /**
     * Lightweight, role-scoped "who's currently active" lookup, re-fetched by the
     * dashboard's active-user widgets whenever the online-presence channel changes,
     * so the list updates in real time without a full page refresh.
     */
    public function getActiveUsers()
    {
        switch (auth()->user()->role) {
            case 'super_admin':
                return response()->json([
                    'active' => UserResource::collection(User::with('profile')
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->whereNot('id', auth()->id())
                        ->get()),
                ]);
            case 'sub_admin':
                return response()->json([
                    'active' => UserResource::collection(User::with('profile')
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->whereNot('id', auth()->id())
                        ->get()),
                ]);
            case 'program_head':
            case 'faculty':
                return response()->json([
                    'active' => UserResource::collection(self::programPeopleQuery(User::teachingProgramIdsFor(auth()->id()))
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->get()),
                ]);
            default:
                return response()->json([]);
        }
    }

    public function itrcDashboard()
    {
        return Inertia::render('super-admin/dashboard', self::getITRCStatistics());
    }

    public function studentDashboard()
    {
        return Inertia::render('student/dashboard', self::getStudentStatistics() + ['my_requests' => self::myRequests(true)] + self::violationLists());
    }

    public function prefectDashboard()
    {
        $appointment = new AppointmentController;
        $prefectProps = array_merge([
            'students' => UserResource::collection(User::with(['program', 'profile', 'enrollments'])
                ->whereRole('student')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->latest('created_at')
                ->get()),
            'students_week_start' => now()->startOfWeek()->toDateString(),
            'students_week_end' => now()->endOfWeek()->toDateString(),
            'appointment_today' => $appointment->getAppointmentToday(),
            'incident_risk_list' => [],
            'active' => UserResource::collection(User::with('profile')
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->whereNot('id', auth()->id())
                ->get()),
        ], self::getPrefectDataStatistics());

        return Inertia::render('prefect/dashboard', $prefectProps);
    }

    public function teacherDashboard()
    {
        return Inertia::render('program/dashboard', self::getTeacherStatistics() + ['my_requests' => self::myRequests()] + self::violationLists());
    }

    public function nonTeachingStaffDashboard()
    {
        return Inertia::render('staff/dashboard', self::getStaffStatictics() + ['my_requests' => self::myRequests()] + self::violationLists());
    }

    public function parentDashboard()
    {
        $parentProps = self::getParentStatistics() + ['my_requests' => self::myRequests()] + self::violationLists();

        return Inertia::render('parent/dashboard', $parentProps);
    }

    // Guidance gets the same staff dashboard as everyone else, with a card
    // for the referrals they review (their Referrals page lists them all).
    public function guidanceDashboard()
    {
        return Inertia::render('staff/dashboard', array_merge(self::getStaffStatictics(), [
            'is_guidance' => true,
            'referral' => Referral::count(),
            'my_requests' => self::myRequests(),
        ] + self::violationLists()));
    }

    public function getITRCStatistics()
    {
        $account = new User;

        $complaint = Complaint::where('complainant_id', auth()->id())->count('case_number');

        return [
            'new_users' => UserResource::collection($account->newUsers()),
            'new_users_week_start' => now()->startOfWeek()->toDateString(),
            'new_users_week_end' => now()->endOfWeek()->toDateString(),
            'user_list' => UserResource::collection(User::latest('created_at')->get()),
            'complaint' => $complaint,
            'program' => Program::count(),
            'report' => ActionLog::count(),
            'account_total' => $account->count('id'),
            'total_violation' => Violation::count(),
            'total_roles' => \App\Models\Role::count(),
            'active_roles' => \App\Models\Role::active()->count(),
            'maintenance_mode' => Cache::get('maintenance_mode', false),
            'user_graph' => self::getUserGraph(),
            'graph_school_years' => SchoolYearResource::collection(\App\Models\SchoolYear::orderByDesc('year')->get(['id', 'year'])),
            'current_school_year_id' => SchoolYearSemester::current()?->school_year_id,
            'active' => UserResource::collection(User::with('profile')
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->whereNot('id', auth()->id())
                ->get()),
        ];
    }

    public function getPrefectDataStatistics()
    {
        $complaint = Complaint::count();
        // Same as the Complaints page's Pending/Ongoing tabs (and the Up
        // next panel): archived complaints aren't listed there.
        $pendingComplaint = Complaint::where('complaint_status', 'pending')->whereNull('archived_at')->count();
        $ongoingComplaint = Complaint::where('complaint_status', 'ongoing')->whereNull('archived_at')->count();
        $resolvedComplaint = Complaint::where('complaint_status', 'resolved')->count();

        $referral = Referral::count();
        $appointment = Appointment::count();
        // Same set the card links to: /prefect/user-list?is-enrolled=1, which
        // opens on the current school year and semester.
        $current = \App\Models\SchoolYearSemester::current();
        $student = User::whereRole('student')->currentlyEnrolled()
            ->when($current, fn ($q) => $q->whereHas('enrollments', fn ($e) => $e
                ->where('status', 'enrolled')
                ->where('semester', $current->semester)
                ->whereHas('schoolYear', fn ($sy) => $sy->where('year', $current->schoolYear?->year))))
            ->count();
        $majorMinorCount = 0;

        // This week's complaints (Mon-Sun, same week as the "New Students" list).
        $thisWeek = fn () => Complaint::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);

        $complaintPieChart = [
            'reported' => $thisWeek()->count(),
            'pending' => $thisWeek()->where('complaint_status', 'pending')->count(),
            'ongoing' => $thisWeek()->where('complaint_status', 'ongoing')->count(),
            'resolved' => $thisWeek()->where('complaint_status', 'resolved')->count(),
        ];

        // NOTE: archived-document count computed directly here rather than via ArchiveController,
        // which still references pre-refactor relations and is out of scope for this pass.
        $archivedCount = Complaint::whereNotNull('archived_at')->count()
                        + Referral::whereNotNull('archived_at')->count();

        $countUnresolvedComplaints = Complaint::whereIn('complaint_status', ['pending', 'ongoing']);

        return [
            'student' => $student,
            'major_minor_count' => $majorMinorCount,
            'complaint' => $complaint,
            'pending_complaint' => $pendingComplaint,
            'ongoing_complaint' => $ongoingComplaint,
            'resolved_complaint' => $resolvedComplaint,
            'referral' => $referral,
            'archive' => $archivedCount,
            'appointment' => $appointment,
            'total_violation' => Violation::count(),
            'complaint_piechart' => $complaintPieChart,
            'program' => ProgramResource::collection(Program::orderBy('id')->get(['code', 'color_code'])),
            'bargraph' => self::getPrefectBarGraph(),
            'bargraph_school_years' => SchoolYearResource::collection(\App\Models\SchoolYear::orderByDesc('year')->get(['id', 'year'])),
            'current_school_year_id' => SchoolYearSemester::current()?->school_year_id,
            'offense_list' => ViolationResource::collection(Violation::active()->with(['penalties.penalty'])->latest('created_at')->get()),
            'penalty_list' => PenaltyResource::collection(Penalty::latest('created_at')->get()),
            'review_queue' => self::reviewQueue(),
            'countLastMonthUnresolvedComplaint' => $countUnresolvedComplaints->count(),
            'label' => self::getDynamicComplaintLabel($countUnresolvedComplaints
                ->orderBy('created_at', 'asc')
                ->value('created_at')
            ),
        ];
    }

    /**
     * The "List of Violations" and "List of Penalties" tabs, sent with the
     * page (as on the prefect dashboard) instead of fetched by the tabs.
     */
    private static function violationLists(): array
    {
        return [
            'offense_list' => ViolationResource::collection(Violation::active()->with(['penalties.penalty'])->latest('created_at')->get()
                ->each(fn ($v) => $v->encrypted_id = encrypt_id($v->id))),
            'penalty_list' => PenaltyResource::collection(Penalty::latest('created_at')->get()),
        ];
    }

    /**
     * The signed-in user's own requests for their dashboard's "My requests"
     * panel: per kind, the earliest one still open (first in, first out) and
     * its status, plus whether they've submitted any at all. Program heads
     * and faculty also get their referrals; students their absent forms and
     * gate passes.
     */
    private static function myRequests(bool $studentForms = false): array
    {
        $id = auth()->id();
        $reasons = fn ($r) => is_array($list = json_decode((string) $r, true)) ? implode(', ', $list) : (string) $r;
        $column = fn (string $key, $query, $any, callable $shape) => [
            'key' => $key,
            'any' => (bool) $any,
            'item' => ($first = $query->oldest('created_at')->first()) ? ['encrypted_id' => encrypt_id($first->id)] + $shape($first) : null,
        ];

        $columns = [
            $column('complaint',
                Complaint::with('violation:id,violation_name')->where('complainant_id', $id)
                    ->whereIn('complaint_status', ['pending', 'ongoing'])->whereNull('archived_at'),
                Complaint::where('complainant_id', $id)->exists(),
                fn ($c) => [
                    'number' => ($c->case_number ? 'Case #' : 'Complaint #').($c->case_number ?? $c->complaint_number),
                    'detail' => $c->violation?->violation_name,
                    'status' => $c->complaint_status,
                    'created_at' => $c->created_at,
                ]),
        ];

        $pending = fn ($q) => $q->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at');

        // Program heads and faculty file referrals.
        if (auth()->user()->isTeacher()) {
            $columns[] = $column('referral',
                $pending(Referral::where('referrer_id', $id)),
                Referral::where('referrer_id', $id)->exists(),
                fn ($r) => ['number' => 'Referral #'.$r->referral_number, 'detail' => \Illuminate\Support\Str::limit((string) $r->reason_description, 80), 'status' => 'pending', 'created_at' => $r->created_at]);
        }

        if ($studentForms) {
            $columns[] = $column('absent_form',
                $pending(Absence::where('student_id', $id)),
                Absence::where('student_id', $id)->exists(),
                fn ($a) => ['number' => 'Absent Form #'.$a->form_number, 'detail' => $reasons($a->reason), 'status' => 'pending', 'created_at' => $a->created_at]);
            $columns[] = $column('gatepass',
                $pending(GatePass::where('user_id', $id)),
                GatePass::where('user_id', $id)->exists(),
                fn ($g) => ['number' => 'Gate Pass #'.$g->gatepass_number, 'detail' => (string) $g->reason, 'status' => 'pending', 'created_at' => $g->created_at]);
        }

        return $columns;
    }

    /**
     * What the prefect should handle next, one card per kind: the oldest
     * item still waiting (first in, first out) and how many are waiting.
     * The "pending" rules match each page's Pending tab.
     */
    private static function reviewQueue(): array
    {
        $name = fn ($u) => $u ? trim(($u->profile?->first_name ?? '').' '.($u->profile?->last_name ?? '')) : null;
        $pending = fn ($q) => $q->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')->whereNull('archived_at');
        $item = function (string $key, $query, callable $shape) {
            $first = (clone $query)->oldest('created_at')->first();

            return ['key' => $key, 'waiting' => (clone $query)->count(), 'item' => $first ? ['encrypted_id' => encrypt_id($first->id)] + $shape($first) : null];
        };

        return [
            $item('complaint_pending',
                Complaint::with(['user.profile', 'violation'])->where('complaint_status', 'pending')->whereNull('archived_at'),
                fn ($c) => [
                    'number' => ($c->case_number ? 'Case #' : 'Complaint #').($c->case_number ?? $c->complaint_number),
                    'detail' => $c->violation?->violation_name,
                    'by' => $c->complainant_name ?: $name($c->user),
                    'created_at' => $c->created_at,
                ]),
            $item('complaint_ongoing',
                Complaint::with(['user.profile', 'violation'])->where('complaint_status', 'ongoing')->whereNull('archived_at'),
                fn ($c) => [
                    'number' => ($c->case_number ? 'Case #' : 'Complaint #').($c->case_number ?? $c->complaint_number),
                    'detail' => $c->violation?->violation_name,
                    'by' => $c->complainant_name ?: $name($c->user),
                    'created_at' => $c->created_at,
                ]),
            $item('referral', $pending(Referral::with('user.profile')), fn ($r) => [
                'number' => 'Referral #'.$r->referral_number,
                'detail' => \Illuminate\Support\Str::limit((string) $r->reason_description, 80),
                'by' => $name($r->user),
                'created_at' => $r->created_at,
            ]),
            $item('absent_form', $pending(Absence::with('user.profile')), fn ($a) => [
                'number' => 'Absent Form #'.$a->form_number,
                // reason is a JSON list of the reasons picked.
                'detail' => \Illuminate\Support\Str::limit(is_array($r = json_decode((string) $a->reason, true)) ? implode(', ', $r) : (string) $a->reason, 80),
                'by' => $name($a->user),
                'created_at' => $a->created_at,
            ]),
            $item('gatepass', $pending(GatePass::with('user.profile')), fn ($g) => [
                'number' => 'Gate Pass #'.$g->gatepass_number,
                'detail' => \Illuminate\Support\Str::limit((string) $g->reason, 80),
                'by' => $name($g->user),
                'created_at' => $g->created_at,
            ]),
        ];
    }

    public function getDynamicComplaintLabel($oldest)
    {
        if (! $oldest) {
            return 'no unresolved complaints';
        }

        $now = now();
        $created = Carbon::parse($oldest);

        $diffDays = $created->diffInDays($now);
        $diffWeeks = $created->diffInWeeks($now);
        $diffMonths = $created->diffInMonths($now);
        $diffYears = $created->diffInYears($now);

        if ($diffDays === 0) {
            return 'unresolved complaints today';
        }

        if ($diffDays === 1) {
            return 'unresolved complaints yesterday';
        }

        if ($diffDays < 7) {
            return 'unresolved complaints this week';
        }

        if ($diffWeeks < 4) {
            return 'unresolved complaints last few weeks';
        }

        if ($diffMonths === 1) {
            return 'unresolved complaints last month';
        }

        if ($diffMonths < 12) {
            return 'unresolved complaints in previous months';
        }

        if ($diffYears === 1) {
            return 'unresolved complaints last year';
        }

        return 'unresolved complaints in previous years';
    }

    public function getStudentStatistics()
    {
        $id = auth()->id();

        $complaint = Complaint::where('complainant_id', $id)->count();

        $appointmentCount = Appointment::where('user_id', $id)->count();
        $appointment = new AppointmentController;

        $gatepass = GatePass::where('user_id', $id)->count();
        $absentForm = Absence::where('student_id', $id)->count();

        return [
            'complaint' => $complaint,
            'appointment' => $appointmentCount,
            'gatepass' => $gatepass,
            'absent_form' => $absentForm,
            'upcoming_appointment' => UserResource::collection($appointment->getUpcomingAppointmentList($id)),
        ];
    }

    /**
     * Shared statistics for program heads and faculty. A program head
     * additionally sees faculty-wide stats; a faculty member only sees
     * their own complaint/student stats.
     *
     * NOTE: "students in program" is computed as "has any enrollment row in this
     * program", not restricted to the most recent term only — a simplification
     * for this pass.
     */
    public function getTeacherStatistics()
    {
        $id = auth()->id();
        $teaching = auth()->user()->teaching;
        $isProgramHead = (bool) $teaching?->isProgramHead();
        $programIds = $isProgramHead ? $teaching->programs_handled->pluck('id') : collect([$teaching?->program_id]);

        $complaint = Complaint::where('complainant_id', $id)->count();
        $referral = Referral::where('referrer_id', $id)->count('id');

        $studentCount = Enrollment::whereIn('program_id', $programIds)->distinct('student_id')->count('student_id');

        // Everyone in this teacher's program(s): own program + any they head.
        $myProgramIds = User::teachingProgramIdsFor($id);

        $props = [
            'complaint' => $complaint,
            'referral' => $referral,
            'student_list' => $studentCount,
            'is_program_head' => $isProgramHead,
            'active' => UserResource::collection(self::programPeopleQuery($myProgramIds)
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->get()),
            'new_users' => UserResource::collection(self::programPeopleQuery($myProgramIds)
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->latest('created_at')
                ->get()),
            'new_users_week_start' => now()->startOfWeek()->toDateString(),
            'new_users_week_end' => now()->endOfWeek()->toDateString(),
        ];

        if ($isProgramHead) {
            $props['faculty'] = \App\Models\Faculty::whereIn('program_id', $programIds)
                ->whereIn('user_id', \App\Models\User::whereRole('faculty')->select('id'))
                ->count();
        }

        return $props;
    }

    /**
     * Students (latest enrollment) and program heads and faculty (own or headed program)
     * in these programs, excluding the current user.
     */
    private static function programPeopleQuery($programIds)
    {
        $studentIds = Enrollment::whereIn('id', Enrollment::selectRaw('MAX(id)')->groupBy('student_id'))
            ->whereIn('program_id', $programIds)
            ->pluck('student_id');
        $teacherIds = \App\Models\Faculty::whereIn('program_id', $programIds)->pluck('user_id')
            ->merge(\App\Models\ProgramHead::whereIn('program_id', $programIds)->pluck('user_id'));

        // Faculty only see their program's students (New Users / Active
        // Users); program heads also see the program's teachers.
        $studentsOnly = auth()->user()->role === 'faculty';

        return User::with(['profile', 'program', 'enrollments.program', 'faculty.program', 'headships.program'])
            ->whereIn('id', $studentsOnly ? $studentIds : $studentIds->merge($teacherIds)->unique())
            ->whereRole($studentsOnly ? ['student'] : ['student', 'program_head', 'faculty'])
            ->whereNot('id', auth()->id());
    }

    public function getStaffStatictics()
    {
        $complaint = Complaint::where('complainant_id', auth()->id())->count();

        return [
            'complaint' => $complaint,
            'approved_gatepass' => GatePass::whereNotNull('confirmed_at')->count(),
            'is_guard' => self::isGuard(),
        ];
    }

    public function getParentStatistics()
    {
        $id = auth()->id();
        $complaint = Complaint::where('complainant_id', $id)->count();
        $appointmentCount = Appointment::where('user_id', $id)->count();

        $familyId = FamilyMember::where('member_id', $id)->value('family_id');
        $children = $familyId
            ? User::whereIn('id', FamilyMember::where('family_id', $familyId)->pluck('member_id'))
                ->whereRole('student')
                ->count()
            : 0;

        return [
            'complaint' => $complaint,
            'children' => $children,
            'appointment' => $appointmentCount,
        ];
    }

    /**
     * Prefect dashboard bar graph: per-program counts of student complainants
     * or offenders, bucketed over one of three ranges —
     *   school_year: month by month from the school year's 1st semester start
     *                to its 2nd semester end (period = school_year id; defaults
     *                to the active school year) — or just one semester's
     *                months when a semester (1|2) is given as the 4th filter,
     *   yearly:      Jan–Dec of a calendar year (period = YYYY),
     *   monthly:     each day of one month (period = YYYY-MM).
     * Students are attributed to the program of their latest enrollment.
     */
    public function getPrefectBarGraph()
    {
        $filter = request('filter', []);
        $dimension = $filter[0] ?? 'complainants';
        $scope = $filter[1] ?? 'school_year';
        $period = $filter[2] ?? null;
        $semester = in_array((string) ($filter[3] ?? ''), ['1', '2'], true) ? (int) $filter[3] : null;

        $programs = Program::orderBy('id')->pluck('id')->all();

        [$start, $end, $step] = self::graphRange($scope, $period, $semester);

        $latestEnrollment = DB::table('enrollment')
            ->selectRaw('student_id, MAX(id) AS id')
            ->groupBy('student_id');

        if ($dimension === 'violators') {
            $query = DB::table('complaint_subject_violation as cso')
                ->join('complaint as c', 'c.id', '=', 'cso.complaint_id')
                ->joinSub($latestEnrollment, 'le', 'le.student_id', '=', 'cso.student_id');
            $countExpr = 'COUNT(DISTINCT cso.student_id)';
        } else {
            $query = DB::table('complaint as c')
                ->joinSub($latestEnrollment, 'le', 'le.student_id', '=', 'c.complainant_id');
            $countExpr = 'COUNT(DISTINCT c.complainant_id)';
        }

        $bucketExpr = $step === 'day'
            ? "DATE_FORMAT(c.created_at, '%Y-%m-%d')"
            : "DATE_FORMAT(c.created_at, '%Y-%m')";

        $rows = $query->join('enrollment as e', 'e.id', '=', 'le.id')
            ->whereBetween('c.created_at', [$start, $end])
            ->selectRaw("e.program_id, {$bucketExpr} AS bucket, {$countExpr} AS count")
            ->groupBy('e.program_id', 'bucket')
            ->get();

        $buckets = self::graphBuckets($start, $end, $step, $scope, count($programs));
        foreach ($buckets as &$bucket) {
            $bucket['others'] = 0;
        }
        unset($bucket);

        foreach ($rows as $row) {
            if (! isset($buckets[$row->bucket])) {
                continue;
            }
            $index = array_search($row->program_id, $programs);
            if ($index === false) {
                $buckets[$row->bucket]['others'] += (int) $row->count;
            } else {
                $buckets[$row->bucket]['count'][$index] = (int) $row->count;
            }
        }

        return array_values($buckets);
    }

    /**
     * Prefect dashboard Watch List: enrolled students the logistic model
     * predicts will repeat a violation. Loaded when the tab opens, so the
     * dashboard itself never waits on the ML service. ?refresh=1 recomputes.
     */
    public function getWatchList()
    {
        return response()->json(\App\Services\WatchListService::get(request()->boolean('refresh')));
    }

    public function getBargraph()
    {
        return response()->json(self::getPrefectBarGraph());
    }

    /**
     * Date range of a dashboard graph filter, shared by the prefect's bar
     * graph and the super admin's user graph —
     *   school_year: its 1st semester start month to its 2nd semester end
     *                month (period = school_year id, default the active one),
     *                or one semester's months when $semester (1|2) is given,
     *   yearly:      Jan–Dec of a calendar year (period = YYYY),
     *   monthly:     each day of one month (period = YYYY-MM).
     * Returns [start, end, step] where step is 'day' or 'month'.
     */
    private static function graphRange(string $scope, $period, ?int $semester): array
    {
        if ($scope === 'monthly') {
            $start = preg_match('/^\d{4}-\d{2}$/', (string) $period)
                ? Carbon::createFromFormat('Y-m-d', "{$period}-01")->startOfDay()
                : now()->startOfMonth();

            return [$start, $start->copy()->endOfMonth(), 'day'];
        }

        if ($scope === 'yearly') {
            $year = ctype_digit((string) $period) ? (int) $period : now()->year;
            $start = Carbon::create($year, 1, 1)->startOfDay();

            return [$start, $start->copy()->endOfYear(), 'month'];
        }

        $schoolYear = $period
            ? \App\Models\SchoolYear::with('semesters')->find($period)
            : SchoolYearSemester::current()?->schoolYear?->load('semesters');
        $schoolYear ??= \App\Models\SchoolYear::with('semesters')->orderByDesc('year')->first();

        $semesters = $schoolYear?->semesters
            ->when($semester, fn ($all) => $all->where('semester', $semester));
        $first = $semesters?->min('date_start');
        $last = $semesters?->max('date_end');

        return [
            $first ? Carbon::parse($first)->startOfMonth() : now()->startOfYear(),
            $last ? Carbon::parse($last)->endOfMonth() : now()->endOfYear(),
            'month',
        ];
    }

    /**
     * Every day/month in the range keyed Y-m-d / Y-m (so empty ones still
     * show on the axis), each with its axis label and $series zeroed counts.
     */
    private static function graphBuckets(Carbon $start, Carbon $end, string $step, string $scope, int $series): array
    {
        $buckets = [];
        for ($cursor = $start->copy(); $cursor->lte($end); $step === 'day' ? $cursor->addDay() : $cursor->addMonthNoOverflow()) {
            $key = $step === 'day' ? $cursor->format('Y-m-d') : $cursor->format('Y-m');
            $buckets[$key] = [
                'label' => match (true) {
                    $step === 'day' => $cursor->format('M j'),
                    $scope === 'school_year' => $cursor->format('M Y'),
                    default => $cursor->format('M'),
                },
                'count' => array_fill(0, $series, 0),
            ];
        }

        return $buckets;
    }

    /**
     * Super admin dashboard line graph: users registered per day/month,
     * one line per role (the user's current role), over the same
     * school year / yearly / monthly ranges as the prefect's bar graph.
     * filter = [scope, period, semester].
     */
    public static function getUserGraph(): array
    {
        $filter = request('filter', []);
        $scope = in_array($filter[0] ?? '', ['school_year', 'yearly', 'monthly'], true) ? $filter[0] : 'school_year';
        $period = $filter[1] ?? null;
        $semester = in_array((string) ($filter[2] ?? ''), ['1', '2'], true) ? (int) $filter[2] : null;

        [$start, $end, $step] = self::graphRange($scope, $period, $semester);

        $roles = \App\Models\Role::orderBy('id')->get(['name', 'label']);
        $roleIndex = $roles->pluck('name')->flip();

        $currentRoles = DB::table('user_roles as ur')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->whereRaw('ur.id = (select max(ur2.id) from user_roles as ur2 where ur2.user_id = ur.user_id)')
            ->select('ur.user_id', 'r.name as role');

        $bucketExpr = $step === 'day'
            ? "DATE_FORMAT(u.created_at, '%Y-%m-%d')"
            : "DATE_FORMAT(u.created_at, '%Y-%m')";

        $rows = DB::table('users as u')
            ->joinSub($currentRoles, 'cr', 'cr.user_id', '=', 'u.id')
            ->whereBetween('u.created_at', [$start, $end])
            ->selectRaw("cr.role, {$bucketExpr} AS bucket, COUNT(*) AS count")
            ->groupBy('cr.role', 'bucket')
            ->get();

        $buckets = self::graphBuckets($start, $end, $step, $scope, $roles->count());
        foreach ($rows as $row) {
            if (isset($buckets[$row->bucket], $roleIndex[$row->role])) {
                $buckets[$row->bucket]['count'][$roleIndex[$row->role]] = (int) $row->count;
            }
        }

        return [
            'roles' => $roles->map(fn ($r) => ['name' => $r->name, 'label' => $r->label])->values(),
            'buckets' => array_values($buckets),
        ];
    }

    public function getUserGraphRoute()
    {
        return response()->json(self::getUserGraph());
    }

    /**
     * Backs the "current semester" modal every non-super-admin dashboard
     * opens on click — a read-only, tabbed view of the current user's own
     * complaints/referrals/absent forms/gate passes/appointments filed
     * during the currently active semester. Which tabs even appear is
     * driven by the same allow_complaint/allow_referral/allow_absent_form/
     * allow_appointment/allow_gatepass flags that already gate the
     * "Report ..." buttons elsewhere — a type is included only if the user
     * is allowed to submit it in the first place.
     */
    /**
     * Narrows a query to "created during the current semester" — replaces
     * the old where('school_year_semester_id', ...) now that semesters are
     * identified by date range instead of a stored FK. No current semester
     * (gap between semesters, or none configured) means nothing qualifies.
     */
    private static function scopeToCurrentSemester($query)
    {
        $semester = SchoolYearSemester::current();

        if (! $semester) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereBetween('created_at', [
            $semester->date_start->copy()->startOfDay(),
            $semester->date_end->copy()->endOfDay(),
        ]);
    }

    /**
     * The "records this semester" modal lists only what still needs
     * attention or was turned down: complaints that are pending, ongoing or
     * rejected; appointments only pending; every other type pending or
     * rejected. Approved, resolved and revoked records are left out.
     *
     * Absent forms and gate passes have no status column, so their status
     * comes from the timestamps, in the same order the modal reads them:
     * revoked, then rejected, then confirmed (approved), otherwise pending.
     */
    private static function pendingOrRejected(string $type, $query)
    {
        return match ($type) {
            'complaint' => $query->whereIn('complaint_status', ['pending', 'ongoing', 'rejected']),
            'referral' => $query->whereIn('referral_status', ['pending', 'rejected']),
            'appointment' => $query->where('appointment_status', 'pending'),
            'absent_form', 'gate_pass' => $query->whereNull('revoked_at')
                ->where(fn ($q) => $q->whereNotNull('rejected_at')->orWhereNull('confirmed_at')),
        };
    }

    /** This semester's pending/rejected records of one type, newest first. */
    private static function semesterRecords(string $type, $query)
    {
        $records = self::scopeToCurrentSemester(self::pendingOrRejected($type, $query))
            ->latest('created_at')
            ->get();

        return match ($type) {
            'complaint' => ComplaintResource::collection($records),
            'referral' => ReferralResource::collection($records),
            'absent_form' => AbsenceResource::collection($records),
            'gate_pass' => GatePassResource::collection($records),
            'appointment' => AppointmentResource::collection($records),
        };
    }

    public function myCurrentSemesterRecords()
    {
        $user = auth()->user();
        $permissions = $user->permissions;

        $records = [];
        // Only the record types a role can actually file (each still needs
        // its permission switch on too).
        $types = match ($user->role) {
            'student' => ['complaint', 'absent_form', 'gate_pass', 'appointment'],
            'program_head', 'faculty', 'sub_admin' => ['complaint', 'referral'],
            'parent' => ['complaint', 'appointment'],
            default => ['complaint'], // non-teaching staff, System Admin
        };
        $can = fn (string $type) => in_array($type, $types, true);

        if ($permissions?->allow_complaint && $can('complaint')) {
            $records['complaint'] = self::semesterRecords('complaint',
                Complaint::with(['user.profile', 'subject.profile'])->where('complainant_id', $user->id));
        }

        if ($permissions?->allow_referral && $can('referral')) {
            $records['referral'] = self::semesterRecords('referral',
                Referral::with(['user.profile', 'referredStudent.profile'])->where('referrer_id', $user->id));
        }

        if ($permissions?->allow_absent_form && $can('absent_form')) {
            $records['absent_form'] = self::semesterRecords('absent_form',
                Absence::where('student_id', $user->id));
        }

        if ($permissions?->allow_gatepass && $can('gate_pass')) {
            $records['gate_pass'] = self::semesterRecords('gate_pass',
                GatePass::where('user_id', $user->id));
        }

        if ($permissions?->allow_appointment && $can('appointment')) {
            $records['appointment'] = self::semesterRecords('appointment',
                Appointment::where('user_id', $user->id));
        }

        return response()->json($records);
    }

    /**
     * Same modal, but for a prefect (sub_admin) — they have no personal
     * allow_complaint/allow_referral/etc. permissions row (they approve/
     * manage everyone else's requests rather than filing their own), so
     * "my records" doesn't apply. Instead this shows every record of every
     * type across all students/staff for the currently active semester.
     */
    public function allCurrentSemesterRecords()
    {
        abort_unless(auth()->user()->role === 'sub_admin', 403);

        return response()->json([
            'complaint' => self::semesterRecords('complaint', Complaint::with(['user.profile', 'subject.profile'])),
            'referral' => self::semesterRecords('referral', Referral::with(['user.profile', 'referredStudent.profile'])),
            'absent_form' => self::semesterRecords('absent_form', Absence::with('user.profile')),
            'gate_pass' => self::semesterRecords('gate_pass', GatePass::with('user.profile')),
            'appointment' => self::semesterRecords('appointment', Appointment::with('user.profile')),
        ]);
    }
}
