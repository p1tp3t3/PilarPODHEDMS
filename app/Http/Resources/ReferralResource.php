<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the Referral model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class ReferralResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'teaching_staff_id' => $this->teaching_staff_id,
            'referral_number' => $this->referral_number,
            'reason_description' => $this->reason_description,
            'referral_status' => $this->referral_status,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'revoked_at' => $this->revoked_at,
            'edited_at' => $this->edited_at,
            'send_to_guidance' => $this->send_to_guidance,
            'confirmed_at' => $this->confirmed_at,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user'),
            'referredStudent' => $this->whenLoaded('referredStudent'),
            'referralReferredStudent' => $this->whenLoaded('referralReferredStudent'),
            'revisions' => $this->whenLoaded('revisions'),
        ];
    }
}
