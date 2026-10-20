<?php

namespace App\Console\Commands;

use App\Jobs\ProcessGatePassExpirationNotificationJob;
use App\Models\GatePass;
use Illuminate\Bus\Batch;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

#[Signature('app:notify-gate-pass-expiration-command {--hours=24 : Notify gate passes expiring within this many hours}')]
#[Description('Notifies students whose approved gate pass is about to expire, as a batch of queued notification jobs.')]
class NotifyGatePassExpirationCommand extends Command
{
    /** Gate passes per queued job. */
    private const CHUNK_SIZE = 50;

    /**
     * Picks every approved, still-active gate pass expiring within the next
     * --hours that hasn't been reminded yet, and queues one job per chunk of
     * them as a single batch on the "notifications" queue. Each job marks
     * its gate passes as notified, so re-running never notifies twice.
     */
    public function handle(): void
    {
        $hours = max(1, (int) $this->option('hours'));

        $ids = GatePass::whereNotNull('confirmed_at')
            ->whereNull('rejected_at')
            ->whereNull('revoked_at')
            ->whereNull('archived_at')
            ->whereNull('expiration_notified_at')
            ->whereBetween('date_expiration', [now(), now()->addHours($hours)])
            ->orderBy('date_expiration')
            ->pluck('id');

        if ($ids->isEmpty()) {
            $this->info("No gate passes expiring in the next {$hours} hour(s).");

            return;
        }

        $jobs = $ids->chunk(self::CHUNK_SIZE)
            ->map(fn ($chunk) => new ProcessGatePassExpirationNotificationJob($chunk->values()->all()))
            ->values()
            ->all();

        $batch = Bus::batch($jobs)
            ->allowFailures()
            ->onQueue('notifications')
            ->name('gate-pass-expiration-'.now()->format('Ymd-His'))
            ->catch(function (Batch $batch, \Throwable $e) {
                Log::warning("Gate pass expiration batch {$batch->id}: ".$e->getMessage());
            })
            ->dispatch();

        $this->info("Queued {$ids->count()} gate pass expiration notification(s) in ".count($jobs)." job(s) (batch {$batch->id}).");
    }
}
