<?php

namespace App\Http\Resources\Referral;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * ReferralReferredStudent as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ReferralReferredStudentResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'referral_id' => $this->field('referral_id'),
            'student_id' => $this->field('student_id'),
            'encrypted_id' => $this->field('encrypted_id'),
            'referral' => ReferralResource::make($this->whenLoaded('referral')),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
