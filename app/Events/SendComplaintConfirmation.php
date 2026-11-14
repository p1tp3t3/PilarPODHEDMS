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

class SendComplaintConfirmation implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    private $data;
    public $queue = 'notification';  // 👈 set queue name here


    public function __construct($data)
    {
        $this->data = $data;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $id = $this->data['receiver_id'];
        return [
            new PrivateChannel("complaint.confirmation.$id"),
        ];
    }
    public function broadcastWith() {
        $receiver = $this->data['receiver_id'];
        $notif = Notifications::where('receiver_id',  $receiver)
                              ->latest('created_at')
                              ->get();
        return [
            'response' => NotificationsResource::collection($notif)->resolve(),
        ];
    }
}
