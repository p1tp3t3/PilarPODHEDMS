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
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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
            case 'teaching_staff':
                return self::teachingStaffDashboard();
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
                    'active' => User::with('profile')
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->whereNot('id', auth()->id())
                        ->get(),
                ]);
            case 'sub_admin':
                return response()->json([
                    'active' => User::with('profile')
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->whereNot('id', auth()->id())
                        ->get(),
                ]);
            case 'teaching_staff':
                return response()->json([
                    'active' => self::programPeopleQuery(TeachingStaff::programIdsFor(auth()->id()))
                        ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                        ->get(),
                ]);
            default:
                return response()->json([]);
        }
    }

    public function itrcDashboard()
    {
        return Inertia::render('itrc/dashboard', self::getITRCStatistics());
    }

    public function studentDashboard()
    {
        return Inertia::render('student/dashboard', self::getStudentStatistics());
    }

    public function prefectDashboard()
    {
        $appointment = new AppointmentController;
        $prefectProps = array_merge([
            'students' => User::with(['program', 'profile', 'enrollments'])
                ->whereRole('student')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->latest('created_at')
                ->get(),
            'students_week_start' => now()->startOfWeek()->toDateString(),
            'students_week_end' => now()->endOfWeek()->toDateString(),
            'appointment_today' => $appointment->getAppointmentToday(),
            'incident_risk_list' => [],
            'active' => User::with('profile')
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->whereNot('id', auth()->id())
                ->get(),
        ], self::getPrefectDataStatistics());

        return Inertia::render('prefect/dashboard', $prefectProps);
    }

    public function teachingStaffDashboard()
    {
        return Inertia::render('teaching-staff/dashboard', self::getTeachingStaffStatistics());
    }

    public function nonTeachingStaffDashboard()
    {
        return Inertia::render('staff/dashboard', self::getStaffStatictics());
    }

    public function parentDashboard()
    {
        $parentProps = self::getParentStatistics();

        return Inertia::render('parent/dashboard', $parentProps);
    }

    // Guidance's one real task is reviewing referrals from the prefect —
    // rather than a separate landing page, send them straight there.
    public function guidanceDashboard()
    {
        return redirect('/guidance/referral');
    }

    public function getITRCStatistics()
    {
        $account = new User;

        $complaint = Complaint::where('complainant_id', auth()->id())->count('case_number');

        return [
            'new_users' => $account->newUsers(),
            'new_users_week_start' => now()->startOfWeek()->toDateString(),
            'new_users_week_end' => now()->endOfWeek()->toDateString(),
            'user_list' => User::latest('created_at')->get(),
            'complaint' => $complaint,
            'program' => Program::count(),
            'report' => ActionLog::count(),
            'account_total' => $account->count('id'),
            'total_violation' => Violation::count(),
            'total_roles' => \App\Models\Role::count(),
            'active_roles' => \App\Models\Role::active()->count(),
            'maintenance_mode' => Cache::get('maintenance_mode', false),
            'user_graph' => self::getUserGraph(),
            'graph_school_years' => \App\Models\SchoolYear::orderByDesc('year')->get(['id', 'year']),
            'current_school_year_id' => SchoolYearSemester::current()?->school_year_id,
            'active' => User::with('profile')
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->whereNot('id', auth()->id())
                ->get(),
        ];
    }

    public function getPrefectDataStatistics()
    {
        $complaint = Complaint::count();
        $pendingComplaint = Complaint::where('complaint_status', 'pending')->count();
        $ongoingComplaint = Complaint::where('complaint_status', 'ongoing')->count();
        $resolvedComplaint = Complaint::where('complaint_status', 'resolved')->count();

        $referral = Referral::count();
        $appointment = Appointment::count();
        // Same set the card links to: /prefect/user-list?is-enrolled=1.
        $student = User::whereRole('student')->currentlyEnrolled()->count();
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
            'program' => Program::orderBy('id')->get(['name', 'color_code'])->toArray(),
            'bargraph' => self::getPrefectBarGraph(),
            'bargraph_school_years' => \App\Models\SchoolYear::orderByDesc('year')->get(['id', 'year']),
            'current_school_year_id' => SchoolYearSemester::current()?->school_year_id,
            'offense_list' => Violation::with(['penalties.penalty'])->latest('created_at')->get(),
            'penalty_list' => Penalty::latest('created_at')->get(),
            'countLastMonthUnresolvedComplaint' => $countUnresolvedComplaints->count(),
            'label' => self::getDynamicComplaintLabel($countUnresolvedComplaints
                ->orderBy('created_at', 'asc')
                ->value('created_at')
            ),
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
            'upcoming_appointment' => $appointment->getUpcomingAppointmentList($id),
            'previous_appointment' => $appointment->getPreviousAppointmentList($id),
        ];
    }

    /**
     * Shared statistics for the teaching_staff role. A teaching staff member whose
     * `position` is 'program_head' additionally sees faculty-wide stats; a plain
     * faculty member only sees their own complaint/student stats.
     *
     * NOTE: "students in program" is computed as "has any enrollment row in this
     * program", not restricted to the most recent term only — a simplification
     * for this pass.
     */
    public function getTeachingStaffStatistics()
    {
        $id = auth()->id();
        $teachingStaff = TeachingStaff::where('user_id', $id)->first(['user_id', 'program_id', 'position_id']);
        $programId = $teachingStaff?->program_id;
        $isProgramHead = $teachingStaff?->position === 'program_head';
        $programIds = $isProgramHead ? $teachingStaff->programsHandled->pluck('id') : collect([$programId]);

        $complaint = Complaint::where('complainant_id', $id)->count();
        $referral = Referral::where('teaching_staff_id', $id)->count('id');

        $studentCount = Enrollment::whereIn('program_id', $programIds)->distinct('student_id')->count('student_id');

        // Everyone in this teacher's program(s): own program + any they head.
        $myProgramIds = TeachingStaff::programIdsFor($id);

        $props = [
            'complaint' => $complaint,
            'referral' => $referral,
            'student_list' => $studentCount,
            'is_program_head' => $isProgramHead,
            'active' => self::programPeopleQuery($myProgramIds)
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->get(),
            'new_users' => self::programPeopleQuery($myProgramIds)
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->latest('created_at')
                ->get(),
            'new_users_week_start' => now()->startOfWeek()->toDateString(),
            'new_users_week_end' => now()->endOfWeek()->toDateString(),
        ];

        if ($isProgramHead) {
            $props['faculty'] = TeachingStaff::whereIn('program_id', $programIds)->count();
        }

        return $props;
    }

    /**
     * Students (latest enrollment) and teaching staff (own or headed program)
     * in these programs, excluding the current user.
     */
    private static function programPeopleQuery($programIds)
    {
        $studentIds = Enrollment::whereIn('id', Enrollment::selectRaw('MAX(id)')->groupBy('student_id'))
            ->whereIn('program_id', $programIds)
            ->pluck('student_id');
        $teacherIds = TeachingStaff::whereIn('program_id', $programIds)->pluck('user_id')
            ->merge(\App\Models\ProgramHeadProgram::whereIn('program_id', $programIds)->pluck('user_id'));

        return User::with(['profile', 'program', 'enrollments.program', 'teachingStaff.program'])
            ->whereIn('id', $studentIds->merge($teacherIds)->unique())
            ->whereRole(['student', 'teaching_staff'])
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
        $appointment = new AppointmentController;

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
            'upcoming_appointment' => $appointment->getUpcomingAppointmentList($id),
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

    /** One student's predicted risk — gates "Set Appointment" on their violations page. */
    public function getStudentRisk($id)
    {
        $id = decrypt_id($id) ?? abort(404);

        return response()->json(\App\Services\WatchListService::forStudent($id));
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

    public function myCurrentSemesterRecords()
    {
        $user = auth()->user();
        $permissions = $user->permissions;

        $records = [];

        if ($permissions?->allow_complaint) {
            $records['complaint'] = self::scopeToCurrentSemester(
                Complaint::with(['user.profile', 'subject.profile'])->where('complainant_id', $user->id)
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id));
        }

        if ($permissions?->allow_referral && $user->role !== 'student') {
            $records['referral'] = self::scopeToCurrentSemester(
                Referral::with(['user.profile', 'referredStudent.profile'])->where('teaching_staff_id', $user->id)
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id));
        }

        if ($permissions?->allow_absent_form) {
            $records['absent_form'] = self::scopeToCurrentSemester(
                Absence::where('student_id', $user->id)
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id));
        }

        if ($permissions?->allow_gatepass) {
            $records['gate_pass'] = self::scopeToCurrentSemester(
                GatePass::where('user_id', $user->id)
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id));
        }

        if ($permissions?->allow_appointment) {
            $records['appointment'] = self::scopeToCurrentSemester(
                Appointment::where('user_id', $user->id)
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id));
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
            'complaint' => self::scopeToCurrentSemester(
                Complaint::with(['user.profile', 'subject.profile'])
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id)),
            'referral' => self::scopeToCurrentSemester(
                Referral::with(['user.profile', 'referredStudent.profile'])
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id)),
            'absent_form' => self::scopeToCurrentSemester(
                Absence::with('user.profile')
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id)),
            'gate_pass' => self::scopeToCurrentSemester(
                GatePass::with('user.profile')
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id)),
            'appointment' => self::scopeToCurrentSemester(
                Appointment::with('user.profile')
            )->latest('created_at')->get()->each(fn ($r) => $r->encrypted_id = encrypt_id($r->id)),
        ]);
    }
}
