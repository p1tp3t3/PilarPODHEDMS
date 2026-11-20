<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\InterventionViolation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Interventions (Appointment menu -> Interventions, and the early-intervention
 * predictor's "interventions since last" count): what the Prefect did for
 * students, each linked to the violation(s) it was about.
 *
 *   - related violations on accepted appointments and approved referrals
 *     (each referred student linked to their own violation);
 *   - appointments set from a complaint before its verdict (Intervene on a
 *     complaint: appointment.complaint_id);
 *   - call-ins (office calls), each with its reference number, attendance,
 *     related violation and the student's notification (Call-In History).
 *
 * A link only ever names a violation the student has a resolved record of,
 * as the forms allow. Run after ComplaintSeeder, ReferralSeeder and
 * AppointmentSeeder.
 */
class InterventionSeeder extends Seeder
{
    /** student id => their resolved violation ids, most recent first */
    private array $records = [];

    public function run(): void
    {
        $prefect = User::whereRole('sub_admin')->first();
        if (! $prefect) {
            $this->command?->warn('InterventionSeeder skipped: needs the Prefect (run AdminSeeder first).');

            return;
        }
        $this->loadRecords();

        $this->linkAppointments();
        $this->linkReferrals();
        $this->complaintAppointments();
        $this->callIns($prefect, 8);
    }

    private function loadRecords(): void
    {
        $rows = DB::table('complaint_subject_violation as cso')
            ->join('complaint as c', 'c.id', '=', 'cso.complaint_id')
            ->where('c.complaint_status', 'resolved')
            ->whereNotNull('cso.violation_id')
            ->orderByDesc(DB::raw('COALESCE(c.offense_issued_at, c.resolved_at, c.confirmed_at, c.created_at)'))
            ->get(['cso.student_id', 'cso.violation_id']);
        foreach ($rows as $r) {
            $this->records[(int) $r->student_id][] = (int) $r->violation_id;
        }
        $this->records = array_map(fn ($ids) => array_values(array_unique($ids)), $this->records);
    }

    /** One (or two) of the student's own violations, or none. */
    private function violationsFor(int $studentId, int $max = 1): array
    {
        $own = $this->records[$studentId] ?? [];

        return array_slice($own, 0, min($max, count($own)));
    }

    /** Most accepted appointments are about one of the student's violations. */
    private function linkAppointments(): void
    {
        $appointments = DB::table('appointment')->where('appointment_status', 'accepted')->get(['id', 'user_id']);
        foreach ($appointments as $a) {
            $ids = $this->violationsFor((int) $a->user_id, random_int(1, 2));
            if ($ids && random_int(1, 100) <= 75) {
                InterventionViolation::sync(InterventionViolation::APPOINTMENT, (int) $a->id, (int) $a->user_id, $ids);
            }
        }
    }

    /** Approved referrals: each referred student about their own violation. */
    private function linkReferrals(): void
    {
        $referred = DB::table('referral_referred_student as rs')
            ->join('referral as r', 'r.id', '=', 'rs.referral_id')
            ->whereNotNull('r.confirmed_at')->whereNull('r.rejected_at')->whereNull('r.revoked_at')
            ->get(['r.id', 'rs.student_id']);
        foreach ($referred as $r) {
            $ids = $this->violationsFor((int) $r->student_id);
            if ($ids && random_int(1, 100) <= 80) {
                InterventionViolation::sync(InterventionViolation::REFERRAL, (int) $r->id, (int) $r->student_id, $ids);
            }
        }
    }

    /**
     * Intervene on a complaint before its verdict: an appointment with one of
     * its subjects, kept on the appointment (complaint_id), most of them
     * attended (so they show under Interventions -> Complaints).
     */
    private function complaintAppointments(): void
    {
        $complaints = DB::table('complaint')->whereIn('complaint_status', ['pending', 'ongoing'])
            ->inRandomOrder()->limit(4)->get(['id', 'complaint_number', 'created_at']);
        foreach ($complaints as $c) {
            $studentId = DB::table('complaint_subject')->where('complaint_id', $c->id)->value('student_id');
            if (! $studentId) {
                continue;
            }
            $at = Carbon::parse($c->created_at ?? now())->addDays(random_int(1, 4))->setTime(random_int(8, 15), 30);
            $present = $at->isPast() && random_int(1, 100) <= 75;
            $createdAt = Carbon::parse($c->created_at ?? now())->addHours(1);
            // Its reference number from its own date ("{MMDDYY}{daily-seq}").
            $prefix = $createdAt->format('mdy');
            $number = $prefix.str_pad((string) (Appointment::withoutGlobalScopes()->where('appointment_number', 'like', "{$prefix}%")->count() + 1), 2, '0', STR_PAD_LEFT);
            $appointment = Appointment::factory()->create([
                'appointment_number' => $number,
                'user_id' => $studentId,
                'complaint_id' => $c->id,
                'date_time_appoint' => $at,
                'appointment_status' => 'accepted',
                'attendance_status' => $present ? 'present' : 'not_marked',
                'rejected_reason' => null,
                'confirmed_at' => Carbon::parse($c->created_at ?? now())->addHours(random_int(2, 20)),
                'description' => "<p>Consultation with the Prefect of Discipline regarding complaint #{$c->complaint_number}.</p>",
                'created_at' => $createdAt,
            ]);
            // Before the verdict the reported violation isn't on record yet:
            // linked only to one the student already has, if any.
            $ids = $this->violationsFor((int) $studentId);
            if ($ids) {
                InterventionViolation::sync(InterventionViolation::APPOINTMENT, (int) $appointment->id, (int) $studentId, $ids);
            }
        }
    }

    /**
     * Office calls, as NotificationController::notifyCallIn makes them (no
     * email): the call_in row (reference number "{MMDDYY}{daily-seq}",
     * attendance), its related violation, and the student's notification.
     */
    private function callIns(User $prefect, int $count): void
    {
        $students = User::whereRole('student')->where('activate', true)
            ->whereHas('enrollment')->pluck('id')->all();
        if (! $students) {
            return;
        }
        // Students with a record first: a call-in is usually about one.
        usort($students, fn ($a, $b) => isset($this->records[$b]) <=> isset($this->records[$a]));
        $picked = array_slice($students, 0, $count);

        $messages = [
            'Please come to the Prefect of Discipline office tomorrow at 9:00 AM to talk about your recent violation.',
            'You are called in to the Prefect of Discipline office this afternoon at 2:00 PM regarding your conduct.',
            'Please report to the Prefect of Discipline office on Monday at 10:00 AM about the incident on record.',
            'You are requested to see the Prefect of Discipline today before your last class.',
            'Please come to the Prefect of Discipline office on Friday at 1:30 PM for a short talk about your recent violation.',
        ];

        foreach ($picked as $i => $studentId) {
            // The first is earlier this week and attended (the dashboard's
            // This Week tab); the next two are not marked yet; older ones
            // mostly present.
            $at = ($i === 0 ? Carbon::now()->startOfWeek()->addHours(9) : Carbon::now()->subDays(2 + $i * 8 + random_int(0, 3)))
                ->setTime(random_int(8, 15), [0, 15, 30, 45][random_int(0, 3)]);
            if ($at->isFuture()) {
                $at = Carbon::now()->subHour();
            }
            $prefix = $at->format('mdy');
            $number = $prefix.str_pad((string) (DB::table('call_in')->where('call_in_number', 'like', "{$prefix}%")->count() + 1), 2, '0', STR_PAD_LEFT);
            $message = '<p>'.$messages[$i % count($messages)].'</p>';
            $attendance = $i === 0 ? 'present' : ($i < 3 ? 'not_marked' : (random_int(1, 100) <= 75 ? 'present' : 'absent'));

            $callInId = DB::table('call_in')->insertGetId([
                'call_in_number' => $number,
                'student_id' => $studentId,
                'issued_by' => $prefect->id,
                'date_time_call_in' => $at,
                'reason' => $message,
                'call_in_status' => 'accepted',
                'attendance_status' => $attendance,
                'attendance_marked_at' => $attendance === 'not_marked' ? null : $at->copy()->addHours(random_int(1, 5)),
                'confirmed_at' => $at,
                'created_at' => $at,
            ]);
            $ids = $this->violationsFor((int) $studentId);
            if ($ids) {
                InterventionViolation::sync(InterventionViolation::CALL_IN, (int) $callInId, (int) $studentId, $ids);
            }

            $notifId = DB::table('notification')->insertGetId([
                'sender_id' => $prefect->id,
                'receiver_id' => $studentId,
                'notif_type' => 'call_in',
                'content' => 'c',
                'read_since' => in_array($i, [1, 2], true) ? null : $at->copy()->addHours(random_int(1, 3)),
                'created_at' => $at,
            ]);
            DB::table('notification')->where('id', $notifId)->update(['content' => json_encode([
                'id' => $notifId,
                'call_in_id' => $callInId,
                'is_program_head' => false,
                'sender_notif_message' => 'You called in a student.',
                'receiver_notif_message' => $message,
            ])]);
        }
    }
}
