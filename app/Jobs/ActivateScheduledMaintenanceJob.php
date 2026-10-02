<?php

namespace App\Jobs;

use App\Http\Controllers\Modules\System\MaintenanceController;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched with a ->delay() set to the scheduled activation time
 * (MaintenanceController::scheduleMaintenanceMode) so maintenance mode
 * turns on at the right moment via the queue worker alone — no
 * cron/schedule:run trigger required on the server.
 */
class ActivateScheduledMaintenanceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct()
    {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        MaintenanceController::activateScheduledMaintenanceIfDue();
    }
}
