<?php

namespace App\Http\Resources\Notification;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Notifications as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class NotificationsResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'sender_id' => $this->field('sender_id'),
            'receiver_id' => $this->field('receiver_id'),
            'notif_type' => $this->field('notif_type'),
            'content' => $this->field('content'),
            'read_since' => $this->field('read_since'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->encrypted_id,
            'record_key' => $this->record_key,
            'sender' => UserResource::make($this->whenLoaded('sender')),
            'receiver' => UserResource::make($this->whenLoaded('receiver')),
        ];
    }
}
