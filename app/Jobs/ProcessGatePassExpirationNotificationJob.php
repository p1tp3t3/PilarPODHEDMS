<?php

namespace App\Jobs;

use App\Events\NotifyUser;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Models\GatePass;
use App\Models\Notifications;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * One chunk of the gate pass expiration batch: tells each gate pass owner
 * that their pass is about to expire.
 */
class ProcessGatePassExpirationNotificationJob implements ShouldQueue
{
    use Batchable, Queueable;

    public $tries = 3;

    /**
     * @param  int[]  $gatePassIds
     */
    public function __construct(public array $gatePassIds)
    {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $receivers = DB::transaction(function () {
            // Re-checked under a lock: the pass may have been revoked or
            // archived since the command ran, or reminded by another run.
            $gatePasses = GatePass::with(['user.profile', 'user.program'])
                ->whereIn('id', $this->gatePassIds)
                ->whereNotNull('confirmed_at')
                ->whereNull('rejected_at')
                ->whereNull('revoked_at')
                ->whereNull('archived_at')
                ->whereNull('expiration_notified_at')
                ->where('date_expiration', '>', now())
                ->lockForUpdate()
                ->get();

            if ($gatePasses->isEmpty()) {
                return [];
            }

            Notifications::insert($gatePasses->map(fn ($gatePass) => $this->notification($gatePass))->all());
            GatePass::whereIn('id', $gatePasses->pluck('id'))->update(['expiration_notified_at' => now()]);

            return $gatePasses->pluck('user_id')->unique()->all();
        });

        // After commit, so a broadcast failure can't roll back (and later
        // duplicate) notifications that were already saved.
        foreach ($receivers as $receiverId) {
            try {
                broadcast(new NotifyUser($receiverId));
            } catch (\Throwable $e) {
                Log::warning("Gate pass expiration broadcast to user {$receiverId} failed: ".$e->getMessage());
            }
        }
    }

    /** Same shape as the gate pass approval notification, so it opens the same way. */
    private function notification(GatePass $gatePass): array
    {
        $expires = Carbon::parse($gatePass->date_expiration);
        $message = 'Your gate pass will expire on '.$expires->format('F j, Y').' at '.$expires->format('g:i A').'.';
        $user = $gatePass->user;

        return [
            'notif_type' => 'gatepass',
            'sender_id' => null,
            'receiver_id' => $gatePass->user_id,
            'content' => app(GatePassController::class)->getContent([
                'sender_message' => $message,
                'receiver_message' => $message,
                'id' => $gatePass->id,
                'first_name' => $user?->profile?->first_name,
                'last_name' => $user?->profile?->last_name,
                'profile_picture' => $user?->profile?->profile_picture,
                'user_type' => $user?->role,
                'name' => $user?->program?->name,
                'reason' => $gatePass->reason,
                'allow_to' => $gatePass->allow_to,
                'confirmed_at' => $gatePass->confirmed_at,
                'date_expiration' => $gatePass->date_expiration,
                'created_at' => $gatePass->created_at,
            ]),
            'read_since' => null,
        ];
    }
}
