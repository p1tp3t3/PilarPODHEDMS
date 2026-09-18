<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Lets every Guard's Gate Pass Verification page
 * (resources/js/Pages/staff/gatepass-verification.jsx) refresh its approved
 * list the moment the prefect approves a gate pass, without polling. Public
 * channel (mirrors MaintenanceModeToggled) since every Guard needs the same
 * signal — there's nothing user-specific to authorize.
 */
class GatePassApproved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function broadcastOn(): array
    {
        return [
            new Channel('gate-pass-approvals'),
        ];
    }
}
