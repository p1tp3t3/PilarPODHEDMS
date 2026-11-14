<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * UserPermission as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class UserPermissionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->field('user_id'),
            'allow_complaint' => $this->field('allow_complaint'),
            'allow_referral' => $this->field('allow_referral'),
            'allow_absent_form' => $this->field('allow_absent_form'),
            'allow_appointment' => $this->field('allow_appointment'),
            'allow_gatepass' => $this->field('allow_gatepass'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
