<?php

namespace App\Jobs;

use App\Events\NotifyUser;
use App\Models\Appointment;
use App\Models\Notifications;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * One chunk of the appointment reminder batch: reminds each appointed user
 * of their upcoming appointment.
 */
class ProcessAppointmentSchedNotificationJob implements ShouldQueue
{
    use Batchable, Queueable;

    public $tries = 3;

    /**
     * @param  int[]  $appointmentIds
     */
    public function __construct(public array $appointmentIds)
    {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $receivers = DB::transaction(function () {
            // Re-checked under a lock: the appointment may have been
            // rejected, archived or attended since the command ran, or
            // reminded by another run.
            $appointments = Appointment::whereIn('id', $this->appointmentIds)
                ->where('appointment_status', '!=', 'rejected')
                ->where('attendance_status', 'not_marked')
                ->whereNull('archived_at')
                ->whereNull('reminder_notified_at')
                ->where('date_time_appoint', '>', now())
                ->lockForUpdate()
                ->get();

            if ($appointments->isEmpty()) {
                return [];
            }

            Notifications::insert($appointments->map(fn ($appointment) => $this->notification($appointment))->all());
            Appointment::whereIn('id', $appointments->pluck('id'))->update(['reminder_notified_at' => now()]);

            return $appointments->pluck('user_id')->unique()->all();
        });

        // After commit, so a broadcast failure can't roll back (and later
        // duplicate) notifications that were already saved.
        foreach ($receivers as $receiverId) {
            try {
                broadcast(new NotifyUser($receiverId));
            } catch (\Throwable $e) {
                Log::warning("Appointment reminder broadcast to user {$receiverId} failed: ".$e->getMessage());
            }
        }
    }

    /**
     * Same content shape as the scheduling notification, with type
     * "reminder" so the notification page shows it without Accept/Decline.
     */
    private function notification(Appointment $appointment): array
    {
        $date = $appointment->date_time_appoint->format('F j, Y');
        $time = $appointment->date_time_appoint->format('h:i A');
        $message = "Reminder: you have an appointment with the Prefect of Discipline on {$date} at {$time}.";

        return [
            'notif_type' => 'appointment',
            'sender_id' => null,
            'receiver_id' => $appointment->user_id,
            'content' => json_encode([
                'sender_notif_message' => $message,
                'receiver_notif_message' => $message,
                'type' => 'reminder',
                'id' => $appointment->id,
                'date_appoint' => $date,
                'time_appoint' => $time,
                'reason' => $appointment->description,
                'accept' => null,
            ]),
            'read_since' => null,
        ];
    }
}
