<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A quiet "your conversation list changed" signal on a user's own
 * chat.{id} channel, for what the other chat events don't tell them: a
 * message they sent or read, edited or unsent from another tab or device.
 * The chat page reloads its list (no sound, no badge change — unlike
 * MessageSent, which the header treats as an incoming message).
 */
class ChatListChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public $queue = 'notification';

    public function __construct(private int $userId)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("chat.{$this->userId}"),
        ];
    }

    public function broadcastWith(): array
    {
        return ['user_id' => $this->userId];
    }
}
