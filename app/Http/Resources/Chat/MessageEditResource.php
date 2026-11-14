<?php

namespace App\Http\Resources\Chat;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * MessageEdit as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class MessageEditResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'message_id' => $this->field('message_id'),
            'body' => $this->field('body'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'message' => MessageResource::make($this->whenLoaded('message')),
        ];
    }
}
