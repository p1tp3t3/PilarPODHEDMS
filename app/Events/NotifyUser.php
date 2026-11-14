<?php

namespace App\Events;

use App\Models\Notifications;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Http\Resources\Notification\NotificationsResource;

class NotifyUser implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public $receiver;
    public function __construct($receiver)
    {
        $this->receiver = $receiver;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('notify.' . $this->receiver),
        ];
    }
    public function broadcastWith() {
        $notif = Notifications::where('receiver_id',  $this->receiver);
        $notSeenCount = $notif->whereNull('read_since')->count();

        return [
            'response' => NotificationsResource::collection($notif
                          ->latest('created_at')
                          ->limit(5)
                          ->get())->resolve(),
            'count' => $notSeenCount,
            'size' => $notif->count()
        ];
    }
}
