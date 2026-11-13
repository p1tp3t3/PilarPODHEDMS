<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Maintenance was scheduled or the schedule cancelled: every page's countdown updates live. */
class MaintenanceScheduleChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** ISO 8601 start time, or null when there's no schedule anymore. */
    public function __construct(public ?string $scheduledAt) {}

    public function broadcastOn(): array
    {
        return [new Channel('maintenance')];
    }

    public function broadcastWith(): array
    {
        return ['scheduled_at' => $this->scheduledAt];
    }
}
