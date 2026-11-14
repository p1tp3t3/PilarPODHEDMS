<?php

namespace App\Http\Resources\Family;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Parents as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ParentsResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->field('user_id'),
            'parent_role' => $this->field('parent_role'),
            'work_occupation' => $this->field('work_occupation'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
