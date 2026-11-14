<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Http\Resources\Chat\MessageResource;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public $queue = 'notification';

    public function __construct(private Message $message)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("chat.{$this->message->receiver_id}"),
        ];
    }

    public function broadcastWith(): array
    {
        $this->message->load(['sender.profile', 'replyTo.sender.profile']);

        return [
            'message' => MessageResource::make($this->message)->resolve(),
            'unread_count' => Message::where('receiver_id', $this->message->receiver_id)
                ->whereNull('read_at')
                ->count(),
        ];
    }
}
