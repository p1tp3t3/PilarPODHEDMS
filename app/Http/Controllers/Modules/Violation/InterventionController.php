<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Http\Controllers\Controller;
use App\Http\Resources\Account\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The Prefect's Interventions page: the students already intervened, one row
 * per student: each attended appointment (one set from a complaint's
 * Intervene: a Complaint intervention), attended office call (call-in) and
 * approved referral (what the early-intervention predictor counts, see
 * ViolationRiskFeatures). The related violations show in each one's view.
 */
class InterventionController extends Controller
{
    public function index()
    {
        return list_page('prefect/interventions', [
            // Loaded by the page from /api/prefect/interventions.
            'interventions' => list_prop(fn () => ['data' => $this->rows()]),
            // The filter dropdowns' options.
            'school_years' => \App\Models\SchoolYear::orderByDesc('year')->pluck('year'),
            'programs' => \App\Models\Program::orderBy('code')->get(['id', 'code']),
        ]);
    }

    /**
     * The prefect dashboard's "This Week" tab: the students intervened this
     * week (Monday to Sunday, like its New Students tab), the same rows as
     * the Interventions page.
     */
    public function thisWeek()
    {
        $start = now()->startOfWeek();
        $end = now()->endOfWeek();
        $rows = array_values(array_filter($this->rows(), function ($r) use ($start, $end) {
            return $r['date'] && \Carbon\Carbon::parse($r['date'])->between($start, $end);
        }));

        return response()->json([
            'week_start' => $start->toDateString(),
            'week_end' => $end->toDateString(),
            'interventions' => $rows,
        ]);
    }

    private function rows(): array
    {
        $rows = [];

        // An appointment set from a complaint (its Intervene button) is
        // listed as a Complaint intervention, under the complaint's number.
        $appointments = DB::table('appointment as a')
            ->leftJoin('complaint as c', 'c.id', '=', 'a.complaint_id')
            ->get(['a.*', 'c.complaint_number']);
        foreach ($appointments as $a) {
            [$status, $tone] = match (true) {
                $a->appointment_status === 'pending' => ['Waiting for Reply', 'amber'],
                $a->appointment_status === 'rejected' => ['Declined', 'red'],
                $a->attendance_status === 'present' => ['Attended', 'green'],
                $a->attendance_status === 'absent' => ['Absent', 'red'],
                default => ['Scheduled', 'blue'],
            };
            $rows[] = [
                'type' => $a->complaint_id ? 'complaint' : 'appointment',
                'record_id' => (int) $a->id,
                // Opens the appointment (the intervention itself).
                'encrypted_id' => encrypt_id((int) $a->id),
                'reference' => $a->complaint_id ? $a->complaint_number : $a->appointment_number,
                'student_id' => (int) $a->user_id,
                'date' => $a->date_time_appoint,
                'status' => $status,
                'tone' => $tone,
                'counts' => $a->appointment_status === 'accepted' && $a->attendance_status === 'present',
            ];
        }

        foreach (DB::table('call_in')->get() as $c) {
            $rows[] = [
                'type' => 'call_in',
                'record_id' => (int) $c->id,
                'encrypted_id' => encrypt_id((int) $c->id),
                'reference' => $c->call_in_number,
                'student_id' => (int) $c->student_id,
                'date' => $c->date_time_call_in ?? $c->created_at,
                'status' => ucfirst(str_replace('_', ' ', (string) $c->attendance_status)),
                'tone' => $c->attendance_status === 'present' ? 'green' : 'amber',
                // Intervened: the student came (marked present).
                'counts' => $c->attendance_status === 'present',
            ];
        }

        // A referral: one row per referred student.
        $referred = DB::table('referral_referred_student as rs')
            ->join('referral as r', 'r.id', '=', 'rs.referral_id')
            ->get(['r.*', 'rs.student_id']);
        foreach ($referred as $r) {
            $approved = $r->confirmed_at && ! $r->revoked_at && ! $r->rejected_at;
            [$status, $tone] = match (true) {
                (bool) $r->revoked_at => ['Revoked', 'gray'],
                (bool) $r->rejected_at => ['Rejected', 'red'],
                $approved => ['Approved', 'green'],
                default => ['Waiting for Approval', 'amber'],
            };
            $rows[] = [
                'type' => 'referral',
                'record_id' => (int) $r->id,
                'encrypted_id' => encrypt_id((int) $r->id),
                'reference' => $r->referral_number,
                'student_id' => (int) $r->student_id,
                'date' => $r->confirmed_at ?? $r->created_at,
                'status' => $status,
                'tone' => $tone,
                'counts' => $approved,
            ];
        }

        // Only the ones already done: an attended appointment, a sent
        // call-in, an approved referral.
        $rows = array_values(array_filter($rows, fn ($r) => $r['counts']));

        // Students only: interventions are for students (an appointment with
        // a parent is not one).
        $students = User::whereRole('student')
            ->with(['profile', 'program', 'enrollments', 'latestEnrollment'])
            ->whereIn('id', array_unique(array_column($rows, 'student_id')))
            ->get()
            ->keyBy('id');
        $rows = array_values(array_filter($rows, fn ($r) => isset($students[$r['student_id']])));

        $out = [];
        foreach ($rows as $row) {
            $student = $students[$row['student_id']] ?? null;
            // For the page's filters: the school year / semester of its date,
            // and the student's program and year level (latest enrollment).
            $term = \App\Models\SchoolYearSemester::forDate($row['date']);
            $enrollment = $student?->latestEnrollment;
            $out[] = $row + [
                'student' => $student ? UserResource::make($student)->resolve() : null,
                'school_year' => $term?->schoolYear?->year,
                'semester' => $term?->semester,
                'program_id' => $enrollment?->program_id,
                'year_level' => $enrollment?->year_level,
            ];
        }
        usort($out, fn ($a, $b) => strcmp((string) $b['date'], (string) $a['date']));

        // Raw ids stay on the server (the page opens a record by its encrypted id).
        return array_map(function ($r, $i) {
            unset($r['record_id'], $r['student_id'], $r['counts'], $r['status'], $r['tone']);

            return ['id' => $i + 1] + $r;
        }, $out, array_keys($out));
    }
}
