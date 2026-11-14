<?php

namespace App\Http\Resources\Family;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * ParentRegistrationRequest as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ParentRegistrationRequestResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'name' => $this->field('name'),
            'email' => $this->field('email'),
            'parent_details' => $this->field('parent_details'),
            'reason' => $this->field('reason'),
            'status' => $this->field('status'),
            'rejected_reason' => $this->field('rejected_reason'),
            'rejected_at' => $this->field('rejected_at'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'parent' => UserResource::make($this->whenLoaded('parent')),
        ];
    }
}
