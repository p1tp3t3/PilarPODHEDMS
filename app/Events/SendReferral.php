<?php

namespace App\Events;

use App\Models\Notifications;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Http\Resources\Notification\NotificationsResource;

class SendReferral implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    private $id;
    public $queue = 'notification';  // 👈 set queue name here

    public function __construct($id)
    {
        $this->id = $id;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $id = $this->id;

        return [
            new PrivateChannel("referral.$id.send"),
        ];
    }

    public function broadcastWith() {
        $receiver = $this->id;
        $notif = Notifications::where('receiver_id',  $receiver)
                              ->latest('created_at')
                              ->limit(5)
                              ->get();

        return [
            'response' => NotificationsResource::collection($notif)->resolve(),
        ];
    }
}
