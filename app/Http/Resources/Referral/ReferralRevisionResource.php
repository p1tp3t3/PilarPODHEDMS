<?php

namespace App\Http\Resources\Referral;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * ReferralRevision as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ReferralRevisionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'referral_id' => $this->field('referral_id'),
            'reason_description' => $this->field('reason_description'),
            'students' => $this->field('students'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'referral' => ReferralResource::make($this->whenLoaded('referral')),
        ];
    }
}
