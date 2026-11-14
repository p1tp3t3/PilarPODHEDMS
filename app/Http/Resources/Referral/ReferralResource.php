<?php

namespace App\Http\Resources\Referral;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\System\SchoolYearSemesterResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Faithful pass-through of the Referral model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class ReferralResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            // Opens this record's PDF in a new tab; null if none or not allowed.
            'pdf_url' => $this->resource->pdfUrl($request->user()),
            'referrer_id' => $this->referrer_id,
            'prefect_id' => $this->prefect_id,
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
            'user' => UserResource::make($this->whenLoaded('user')),
            'prefect' => UserResource::make($this->whenLoaded('prefect')),
            'referredStudent' => UserResource::make($this->whenLoaded('referredStudent')),
            'referralReferredStudent' => ReferralReferredStudentResource::collection($this->whenLoaded('referralReferredStudent')),
            'revisions' => ReferralRevisionResource::collection($this->whenLoaded('revisions')),
            'school_year_semester' => SchoolYearSemesterResource::make($this->schoolYearSemester()),
            'confirmed_school_year_semester' => SchoolYearSemesterResource::make($this->confirmedSchoolYearSemester()),
            'rejected_school_year_semester' => SchoolYearSemesterResource::make($this->rejectedSchoolYearSemester()),
            'revoked_school_year_semester' => SchoolYearSemesterResource::make($this->revokedSchoolYearSemester()),
        ];
    }
}
