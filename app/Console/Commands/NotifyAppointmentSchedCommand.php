<?php

namespace App\Console\Commands;

use App\Jobs\ProcessAppointmentSchedNotificationJob;
use App\Models\Appointment;
use Illuminate\Bus\Batch;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

#[Signature('app:notify-appointment-sched-command {--hours=24 : Remind appointments scheduled within this many hours}')]
#[Description('Reminds users of their upcoming appointment, as a batch of queued notification jobs.')]
class NotifyAppointmentSchedCommand extends Command
{
    /** Appointments per queued job. */
    private const CHUNK_SIZE = 50;

    /**
     * Picks every upcoming appointment within the next --hours that isn't
     * rejected, archived, already attended or already reminded, and queues
     * one job per chunk of them as a single batch on the "notifications"
     * queue. Each job marks its appointments as reminded, so re-running
     * never reminds twice.
     */
    public function handle(): void
    {
        $hours = max(1, (int) $this->option('hours'));

        $ids = Appointment::where('appointment_status', '!=', 'rejected')
            ->where('attendance_status', 'not_marked')
            ->whereNull('archived_at')
            ->whereNull('reminder_notified_at')
            ->whereBetween('date_time_appoint', [now(), now()->addHours($hours)])
            ->orderBy('date_time_appoint')
            ->pluck('id');

        if ($ids->isEmpty()) {
            $this->info("No appointments in the next {$hours} hour(s).");

            return;
        }

        $jobs = $ids->chunk(self::CHUNK_SIZE)
            ->map(fn ($chunk) => new ProcessAppointmentSchedNotificationJob($chunk->values()->all()))
            ->values()
            ->all();

        $batch = Bus::batch($jobs)
            ->allowFailures()
            ->onQueue('notifications')
            ->name('appointment-reminder-'.now()->format('Ymd-His'))
            ->catch(function (Batch $batch, \Throwable $e) {
                Log::warning("Appointment reminder batch {$batch->id}: ".$e->getMessage());
            })
            ->dispatch();

        $this->info("Queued {$ids->count()} appointment reminder(s) in ".count($jobs)." job(s) (batch {$batch->id}).");
    }
}
