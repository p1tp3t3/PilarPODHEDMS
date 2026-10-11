<?php

namespace App\Events;

use App\Models\GroupMessage;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(private GroupMessage $message)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("program-chat.{$this->message->program_id}")];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('sender.profile');

        return ['message' => $this->message->toArray()];
    }
}
