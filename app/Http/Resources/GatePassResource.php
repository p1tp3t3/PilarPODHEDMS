<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the GatePass model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class GatePassResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'gatepass_number' => $this->gatepass_number,
            'user_id' => $this->user_id,
            'reason' => $this->reason,
            'allow_to' => $this->allow_to,
            'confirmed_at' => $this->confirmed_at,
            'date_expiration' => $this->date_expiration,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'revoked_at' => $this->revoked_at,
            'edited_at' => $this->edited_at,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user'),
            'school_year_semester' => $this->whenLoaded('schoolYearSemester'),
            'confirmed_school_year_semester' => $this->whenLoaded('confirmedSchoolYearSemester'),
            'rejected_school_year_semester' => $this->whenLoaded('rejectedSchoolYearSemester'),
            'revoked_school_year_semester' => $this->whenLoaded('revokedSchoolYearSemester'),
        ];
    }
}
