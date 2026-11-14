<?php

namespace App\Http\Resources\Chat;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Message as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class MessageResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'sender_id' => $this->field('sender_id'),
            'receiver_id' => $this->field('receiver_id'),
            'body' => $this->field('body'),
            'unsent_at' => $this->field('unsent_at'),
            'edited_at' => $this->field('edited_at'),
            'read_at' => $this->field('read_at'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->encrypted_id,
            'sender' => UserResource::make($this->whenLoaded('sender')),
            'receiver' => UserResource::make($this->whenLoaded('receiver')),
            'reply_to' => MessageResource::make($this->whenLoaded('replyTo')),
            'edits' => MessageEditResource::collection($this->whenLoaded('edits')),
        ];
    }
}
