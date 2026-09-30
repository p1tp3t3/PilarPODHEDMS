<?php

namespace App\Console\Commands;

use App\Events\MaintenanceModeToggled;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

#[Signature('app:activate-scheduled-maintenance-command')]
#[Description('Turns maintenance mode on once its scheduled start time (set via MaintenanceController::scheduleMaintenanceMode) has passed.')]
class ActivateScheduledMaintenanceCommand extends Command
{
    public function handle(): void
    {
        $scheduledAt = Cache::get('maintenance_mode_scheduled_at');

        if (! $scheduledAt || Cache::get('maintenance_mode', false)) {
            $this->info('No scheduled maintenance mode activation found or maintenance mode is already active.');
            return;
        }

        if (now()->lessThan($scheduledAt)) {
            $this->info("Scheduled maintenance mode activation is set for {$scheduledAt}, which has not yet passed.");
            return;
        }

        Cache::forever('maintenance_mode', true);
        Cache::forget('maintenance_mode_scheduled_at');

        broadcast(new MaintenanceModeToggled(true));

        $this->info("Maintenance mode activated (was scheduled for {$scheduledAt}).");
    }
}
