<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the Absence (absent_form) model's existing
 * shape (see ComplaintResource for why this isn't a redesigned contract).
 */
class AbsenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'form_number' => $this->form_number,
            'student_id' => $this->student_id,
            'reason' => $this->reason,
            'evidences' => $this->evidences,
            'note' => $this->note,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'confirmed_at' => $this->confirmed_at,
            'edited_at' => $this->edited_at,
            'revoked_at' => $this->revoked_at,
            'date_from' => $this->date_from,
            'date_to' => $this->date_to,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user'),
            'revisions' => $this->whenLoaded('revisions'),
        ];
    }
}
