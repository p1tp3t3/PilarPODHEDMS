<?php

namespace App\Console\Commands;

use App\Http\Controllers\Modules\System\MaintenanceController;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:activate-scheduled-maintenance-command')]
#[Description('Redundant fallback for ActivateScheduledMaintenanceJob (the delayed queue job dispatched by MaintenanceController::scheduleMaintenanceMode, which does not need this command or a working scheduler to fire) — only does anything if a server happens to also have cron/schedule:run configured.')]
class ActivateScheduledMaintenanceCommand extends Command
{
    public function handle(): void
    {
        if (MaintenanceController::activateScheduledMaintenanceIfDue()) {
            $this->info('Maintenance mode activated.');
        } else {
            $this->info('No scheduled maintenance mode activation due.');
        }
    }
}
