<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * One job per recipient, so notifying every activated user (potentially
 * hundreds) doesn't block the request that triggered it — each notification
 * involves a DB insert and a real-time broadcast, queued via
 * QUEUE_CONNECTION=database instead of running inline per user.
 */
class SendMaintenanceNoticeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected int $senderId,
        protected int $receiverId,
        protected string $message,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        notify_single_user([
            'sender_id' => $this->senderId,
            'receiver_id' => $this->receiverId,
            'notif_type' => 'maintenance_notice',
            'content' => json_encode([
                'sender_notif_message' => 'Sent a maintenance notice to all users.',
                'receiver_notif_message' => $this->message,
            ]),
        ]);
    }
}
