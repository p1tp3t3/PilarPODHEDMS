<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * NonTeachingStaff as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class NonTeachingStaffResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->field('user_id'),
            'position' => $this->position,
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
