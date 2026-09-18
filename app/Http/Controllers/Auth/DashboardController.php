<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Modules\Appointment\AppointmentController;
use App\Models\ActionLog;
use App\Models\Absence;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\Enrollment;
use App\Models\FamilyMember;
use App\Models\GatePass;
use App\Models\Penalty;
use App\Models\Program;
use App\Models\Referral;
use App\Models\Student;
use App\Models\TeachingStaff;
use App\Models\Violation;
use Inertia\Inertia;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{

    public function index() {
        switch(auth()->user()->role) {
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

    private function isGuidance() {
        return \App\Models\NonTeachingStaff::where('user_id', auth()->id())->first()?->position === 'Guidance';
    }

    private function isGuard() {
        return \App\Models\NonTeachingStaff::where('user_id', auth()->id())->first()?->position === 'Guard';
    }



    /**
     * Lightweight, role-scoped "who's currently active" lookup, re-fetched by the
     * dashboard's active-user widgets whenever the online-presence channel changes,
     * so the list updates in real time without a full page refresh.
     */
    public function getActiveUsers() {
        switch (auth()->user()->role) {
            case 'super_admin':
                return response()->json([
                    'active' => User::with('profile')
                                    ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                                    ->whereNot('id', auth()->id())
                                    ->get()
                ]);
            case 'sub_admin':
                return response()->json([
                    'active' => User::with('profile')
                                    ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                                    ->where('role', 'student')
                                    ->whereNot('id', auth()->id())
                                    ->get()
                ]);
            case 'teaching_staff':
                $id = auth()->id();
                $teachingStaff = TeachingStaff::where('user_id', $id)->first(['user_id', 'program_id', 'position_id']);
                $programId = $teachingStaff?->program_id;
                $isProgramHead = $teachingStaff?->position === 'program_head';
                $programIds = $isProgramHead ? $teachingStaff->programsHandled->pluck('id') : collect([$programId]);

                $data = [
                    'active_student' => User::with('profile')
                                            ->where('role', 'student')
                                            ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                                            ->whereNot('id', $id)
                                            ->whereHas('enrollments', function ($q) use ($programIds) {
                                                $q->whereIn('program_id', $programIds);
                                            })
                                            ->get()
                ];

                if ($isProgramHead) {
                    $data['active_faculty'] = User::with('profile')
                                                ->where('role', 'teaching_staff')
                                                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                                                ->whereNot('id', $id)
                                                ->whereHas('teachingStaff', function ($q) use ($programIds) {
                                                    $q->whereIn('program_id', $programIds);
                                                })
                                                ->get();
                }

                return response()->json($data);
            default:
                return response()->json([]);
        }
    }

    public function itrcDashboard() {
        $itrcProps = array_merge([
            'user' => auth()->user(),
        ], self::getITRCStatistics());

        return Inertia::render('itrc/dashboard', $itrcProps);
    }
    public function studentDashboard() {
        $studentProps = array_merge([
            'user' => auth()->user(),
        ], self::getStudentStatistics());

        return Inertia::render('student/dashboard', $studentProps);
    }
    public function prefectDashboard() {
        $appointment = new AppointmentController();
        $prefectProps = array_merge([
            'user' => auth()->user(),
            'students' => User::with(['program', 'profile', 'enrollments'])
                              ->where('role', 'student')
                              ->whereDate('created_at', now()->toDateString())
                              ->latest('created_at')
                              ->get(),
            'appointment_today' => $appointment->getAppointmentToday(),
            'incident_risk_list' => [],
            'active' => User::with('profile')
                            ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                            ->where('role', 'student')
                            ->whereNot('id', auth()->id())
                            ->get()
        ], self::getPrefectDataStatistics());


        return Inertia::render('prefect/dashboard', $prefectProps);
    }
    public function teachingStaffDashboard() {
        $teachingStaffProps = array_merge([
            'user' => auth()->user(),
        ], self::getTeachingStaffStatistics());

        return Inertia::render('teaching-staff/dashboard', $teachingStaffProps);
    }
    public function nonTeachingStaffDashboard() {
        $staffProps = array_merge([
            'user' => auth()->user(),
        ], self::getStaffStatictics());

        return Inertia::render('staff/dashboard', $staffProps);
    }
    public function parentDashboard() {
        $parentProps = array_merge([
            'user' => auth()->user(),
        ], self::getParentStatistics());

        return Inertia::render('parent/dashboard', $parentProps);
    }
    // Guidance's one real task is reviewing referrals from the prefect —
    // rather than a separate landing page, send them straight there.
    public function guidanceDashboard() {
        return redirect('/guidance/referral');
    }




    public function getITRCStatistics() {
        $account = new User();

        $complaint = Complaint::where('complainant_id', auth()->id())->count('case_number');

        $roles = DB::table('users')->select('role')->distinct()->pluck('role')->values()->toArray();

        $raw = DB::table('users')
            ->selectRaw('MONTH(created_at) as month, role, COUNT(*) as count')
            ->groupByRaw('MONTH(created_at), role')
            ->get();

        $monthlyData = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthlyData[$i] = [
                'month' => Carbon::create()->month($i)->format('M'),
                'count' => array_fill(0, count($roles), 0),
            ];
        }

        foreach ($raw as $row) {
            $month = (int) $row->month;
            $roleIndex = array_search($row->role, $roles);

            if ($roleIndex !== false) {
                $monthlyData[$month]['count'][$roleIndex] = (int) $row->count;
            }
        }

        return [
            'new_users' => $account->newUsers(),
            'user_list' => User::latest('created_at')->get(),
            'complaint' => $complaint,
            'program' => Program::count(),
            'report' => ActionLog::count(),
            'account_total' => $account->count('id'),
            'bargraph' => array_values($monthlyData),
            'role' => $roles,
            'active' => User::with('profile')
                            ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                            ->whereNot('id', auth()->id())
                            ->get()
        ];
    }
    public function getPrefectDataStatistics() {
        $complaint = Complaint::count();
        $pendingComplaint = Complaint::where('complaint_status', 'pending')->count();
        $ongoingComplaint = Complaint::where('complaint_status', 'ongoing')->count();
        $resolvedComplaint = Complaint::where('complaint_status', 'resolved')->count();

        $referral = Referral::count();
        $appointment = Appointment::count();
        $student = User::where('role', 'student')->count();
        $majorMinorCount = 0;

        $currentDate = DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')");

        $complaintPieChart = [
            'reported' => Complaint::where($currentDate, now()->toDateString())->count(),
            'pending' => Complaint::where('complaint_status', 'pending')->where($currentDate, now()->toDateString())->count(),
            'ongoing' => Complaint::where('complaint_status', 'ongoing')->where($currentDate, now()->toDateString())->count(),
            'resolved' => Complaint::where('complaint_status', 'resolved')->where($currentDate, now()->toDateString())->count()
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
            'complaint_piechart' => $complaintPieChart,
            'program' => Program::select(['name', 'color_code'])->get()->toArray(),
            'bargraph' => self::getPrefectBarGraph(),
            'offense_list' => Violation::with(['penalties.penalty'])->latest('created_at')->get(),
            'penalty_list' => Penalty::latest('created_at')->get(),
            'countLastMonthUnresolvedComplaint' => $countUnresolvedComplaints->count(),
            'label' => self::getDynamicComplaintLabel($countUnresolvedComplaints
                                                      ->orderBy('created_at', 'asc')
                                                      ->value('created_at')
                        )
        ];
    }
    function getDynamicComplaintLabel($oldest)
    {
        if (!$oldest) {
            return 'no unresolved complaints';
        }

        $now = now();
        $created = Carbon::parse($oldest);

        $diffDays   = $created->diffInDays($now);
        $diffWeeks  = $created->diffInWeeks($now);
        $diffMonths = $created->diffInMonths($now);
        $diffYears  = $created->diffInYears($now);

        if ($diffDays === 0) {
            return "unresolved complaints today";
        }

        if ($diffDays === 1) {
            return "unresolved complaints yesterday";
        }

        if ($diffDays < 7) {
            return "unresolved complaints this week";
        }

        if ($diffWeeks < 4) {
            return "unresolved complaints last few weeks";
        }

        if ($diffMonths === 1) {
            return "unresolved complaints last month";
        }

        if ($diffMonths < 12) {
            return "unresolved complaints in previous months";
        }

        if ($diffYears === 1) {
            return "unresolved complaints last year";
        }

        return "unresolved complaints in previous years";
    }

    public function getStudentStatistics() {
        $id = auth()->id();

        $complaint = Complaint::where('complainant_id', $id)->count();

        $appointmentCount = Appointment::where('user_id', $id)->count();
        $appointment = new AppointmentController();

        $gatepass = GatePass::where('user_id', $id)->count();
        $absentForm = Absence::where('student_id', $id)->count();

        return [
            'complaint' => $complaint,
            'appointment' => $appointmentCount,
            'gatepass' => $gatepass,
            'absent_form' => $absentForm,
            'upcoming_appointment' =>  $appointment->getUpcomingAppointmentList($id)

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
    public function getTeachingStaffStatistics() {
        $id = auth()->id();
        $teachingStaff = TeachingStaff::where('user_id', $id)->first(['user_id', 'program_id', 'position_id']);
        $programId = $teachingStaff?->program_id;
        $isProgramHead = $teachingStaff?->position === 'program_head';
        $programIds = $isProgramHead ? $teachingStaff->programsHandled->pluck('id') : collect([$programId]);

        $complaint = Complaint::where('complainant_id', $id)->count();
        $referral = Referral::where('teaching_staff_id', $id)->count('id');

        $studentCount = Enrollment::whereIn('program_id', $programIds)->distinct('student_id')->count('student_id');

        $activeStudent = User::where('role', 'student')
            ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
            ->whereNot('id', $id)
            ->whereHas('enrollments', function ($q) use ($programIds) {
                $q->whereIn('program_id', $programIds);
            })
            ->get();

        $props = [
            'complaint' => $complaint,
            'referral' => $referral,
            'student_list' => $studentCount,
            'active_student' => $activeStudent,
            'is_program_head' => $isProgramHead,
        ];

        if ($isProgramHead) {
            $props['faculty'] = TeachingStaff::whereIn('program_id', $programIds)->count();
            $props['active_faculty'] = User::where('role', 'teaching_staff')
                ->where('last_seen', '>=', DB::raw('NOW() - INTERVAL 5 MINUTE'))
                ->whereNot('id', $id)
                ->whereHas('teachingStaff', function ($q) use ($programIds) {
                    $q->whereIn('program_id', $programIds);
                })
                ->get();
        }

        return $props;
    }

    public function getStaffStatictics() {
        $complaint = Complaint::where('complainant_id', auth()->id())->count();

        return [
            'complaint' => $complaint,
            'approved_gatepass' => GatePass::whereNotNull('confirmed_at')->count(),
            'is_guard' => self::isGuard(),
        ];
    }
    public function getParentStatistics() {
        $id = auth()->id();
        $complaint = Complaint::where('complainant_id', $id)->count();
        $appointmentCount = Appointment::where('user_id', $id)->count();
        $appointment = new AppointmentController();

        $familyId = FamilyMember::where('member_id', $id)->value('family_id');
        $children = $familyId
            ? User::whereIn('id', FamilyMember::where('family_id', $familyId)->pluck('member_id'))
                  ->where('role', 'student')
                  ->count()
            : 0;

        return [
            'complaint' => $complaint,
            'children' => $children,
            'appointment' => $appointmentCount,
            'upcoming_appointment' =>  $appointment->getUpcomingAppointmentList($id)
        ];
    }

    public function getPrefectBarGraph() {
       // Filter: [dimension, scope, period]
        $filter = request()->has('filter') ? request('filter') : ['', '', ''];
        [$dimension, $scope, $period] = $filter;

        // List of programs for consistent chart indexing
        $programs = Program::pluck('id')->toArray();

        /**
         * ============================================
         * DIMENSION SWITCH (violators | complainants)
         * ============================================
         */
        if ($dimension === 'violators') {

            // Count students who committed violations (complaint_subject_violation),
            // joined through enrollment for program_id (student.program_id moved there).
            $query = DB::table('complaint_subject_violation as cso')
                ->join('enrollment', 'cso.student_id', '=', 'enrollment.student_id')
                ->join('complaint', 'complaint.id', '=', 'cso.complaint_id')
                ->selectRaw('
                    enrollment.program_id,
                    COUNT(DISTINCT cso.student_id) AS count
                ');

        } else {

            // Count student complainants, same enrollment join.
            $query = DB::table('complaint')
                ->join('enrollment', 'complaint.complainant_id', '=', 'enrollment.student_id')
                ->selectRaw('
                    enrollment.program_id,
                    COUNT(DISTINCT complaint.complainant_id) AS count
                ');
        }

        /**
         * ============================================
         * DATE FILTERS (monthly | yearly)
         * ============================================
         */
        if ($scope === 'monthly') {
            // YYYY-MM
            $date = $period ?: now()->format('Y-m');
            [$year, $month] = explode('-', $date);

            $query->addSelect(DB::raw('DAY(complaint.created_at) AS day'))
                ->whereYear('complaint.created_at', $year)
                ->whereMonth('complaint.created_at', $month)
                ->groupBy('day', 'enrollment.program_id');

        } elseif ($scope === 'yearly') {
            // YYYY
            $year = $period ?: now()->year;

            $query->addSelect(DB::raw('MONTH(complaint.created_at) AS month'))
                ->whereYear('complaint.created_at', $year)
                ->groupBy('month', 'enrollment.program_id');

        } else {
            // Default: current year monthly
            $year = now()->year;

            $query->addSelect(DB::raw('MONTH(complaint.created_at) as month'))
                ->whereYear('complaint.created_at', $year)
                ->groupBy('month', 'enrollment.program_id');
        }

        $raw = $query->get();

        /**
         * ============================================
         * BUILD FINAL RESULT ARRAY
         * ============================================
         */

        $result = [];

        if ($scope === 'monthly') {

            $daysInMonth = \Carbon\Carbon::createFromDate($year, $month, 1)->daysInMonth;

            // Initialize structure
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $result[$d] = [
                    'label' => $d,
                    'count' => array_fill(0, count($programs), 0),
                    'others' => 0,
                ];
            }

            // Fill with DB results
            foreach ($raw as $row) {
                $day = (int) $row->day;
                $programIndex = array_search($row->program_id, $programs);

                if ($programIndex !== false) {
                    $result[$day]['count'][$programIndex] = (int) $row->count;
                } else {
                    $result[$day]['others'] += (int) $row->count;
                }
            }

        } else {

            // Yearly 1–12
            for ($m = 1; $m <= 12; $m++) {
                $result[$m] = [
                    'label' => \Carbon\Carbon::create()->month($m)->format('M'),
                    'count' => array_fill(0, count($programs), 0),
                    'others' => 0,
                ];
            }

            foreach ($raw as $row) {
                $month = (int) $row->month;
                $programIndex = array_search($row->program_id, $programs);

                if ($programIndex !== false) {
                    $result[$month]['count'][$programIndex] = (int) $row->count;
                } else {
                    $result[$month]['others'] += (int) $row->count;
                }
            }
        }

        // Reset indexing
        $data = array_values($result);
        return $data;

    }
}
