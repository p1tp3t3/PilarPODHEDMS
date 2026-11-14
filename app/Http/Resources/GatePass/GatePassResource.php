<?php

namespace App\Http\Resources\GatePass;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\System\SchoolYearSemesterResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Faithful pass-through of the GatePass model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class GatePassResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            'gatepass_number' => $this->gatepass_number,
            'user_id' => $this->user_id,
            'prefect_id' => $this->prefect_id,
            'reason' => $this->reason,
            'allow_to' => $this->allow_to,
            'confirmed_at' => $this->confirmed_at,
            'date_expiration' => $this->date_expiration,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'revoked_at' => $this->revoked_at,
            'edited_at' => $this->edited_at,
            'archived_at' => $this->field('archived_at'),
            'created_at' => $this->created_at,
            'user' => UserResource::make($this->whenLoaded('user')),
            'prefect' => UserResource::make($this->whenLoaded('prefect')),
            'school_year_semester' => SchoolYearSemesterResource::make($this->schoolYearSemester()),
            'confirmed_school_year_semester' => SchoolYearSemesterResource::make($this->confirmedSchoolYearSemester()),
            'rejected_school_year_semester' => SchoolYearSemesterResource::make($this->rejectedSchoolYearSemester()),
            'revoked_school_year_semester' => SchoolYearSemesterResource::make($this->revokedSchoolYearSemester()),
        ];
    }
}
