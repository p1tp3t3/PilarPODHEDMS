<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * UserIdNumber as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class UserIdNumberResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'user_id' => $this->field('user_id'),
            'id_number' => $this->field('id_number'),
            'started_at' => $this->field('started_at'),
            'ended_at' => $this->field('ended_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
            'role' => RoleResource::make($this->whenLoaded('role')),
        ];
    }
}
