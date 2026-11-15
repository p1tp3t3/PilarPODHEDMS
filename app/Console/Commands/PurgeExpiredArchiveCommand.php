<?php

namespace App\Console\Commands;

use App\Http\Controllers\Modules\Report\ArchiveController;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

#[Signature('app:purge-expired-archive-command {--dry-run : List what would be deleted, without deleting}')]
#[Description('Permanently deletes archived complaints, referrals, absent forms and gate passes whose keep-until date (archived_at) has passed.')]
class PurgeExpiredArchiveCommand extends Command
{
    /**
     * archived_at is the keep-until date: set by archive_retention_date()
     * (config('app.archive_retention_years') after archiving). Each record
     * past it goes through ArchiveController::purge(), which also removes
     * its saved files.
     */
    public function handle(): void
    {
        $dryRun = (bool) $this->option('dry-run');
        $total = 0;

        foreach (ArchiveController::archivableModels() as $type => $model) {
            $model::whereNotNull('archived_at')
                ->where('archived_at', '<=', now())
                ->orderBy('id')
                ->chunkById(100, function ($records) use ($type, $dryRun, &$total) {
                    foreach ($records as $record) {
                        $total++;
                        if ($dryRun) {
                            $this->line("Would delete {$type} #{$record->id} (kept until {$record->archived_at})");

                            continue;
                        }
                        ArchiveController::purge($type, $record);
                        Log::info("Archive retention: deleted {$type} #{$record->id} (kept until {$record->archived_at}).");
                    }
                });
        }

        $this->info(($dryRun ? 'Would delete' : 'Deleted')." {$total} expired archived record(s).");
    }
}
