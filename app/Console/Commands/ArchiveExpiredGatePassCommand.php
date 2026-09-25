<?php

namespace App\Console\Commands;

use App\Models\GatePass;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:archive-expired-gate-pass-command')]
#[Description('Automatically archives every confirmed gate pass whose date_expiration has passed.')]
class ArchiveExpiredGatePassCommand extends Command
{
    /**
     * Same "expired" definition GatePassController::getGatePassExpired()
     * uses for the Expired tab — confirmed, not yet archived, and past its
     * expiration date. Runs on a schedule so expired gate passes archive
     * themselves instead of needing a prefect to archive them by hand.
     */
    public function handle(): void
    {
        $count = GatePass::whereNotNull('confirmed_at')
            ->whereNull('archived_at')
            ->where('date_expiration', '<=', now())
            ->update(['archived_at' => archive_retention_date()]);

        $this->info("Archived {$count} expired gate pass(es).");
    }
}
