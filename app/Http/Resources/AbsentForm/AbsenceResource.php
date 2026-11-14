<?php

namespace App\Http\Resources\AbsentForm;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\System\SchoolYearSemesterResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Faithful pass-through of the Absence (absent_form) model's existing
 * shape (see ComplaintResource for why this isn't a redesigned contract).
 */
class AbsenceResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            // Opens this record's PDF in a new tab; null if none or not allowed.
            'pdf_url' => $this->resource->pdfUrl($request->user()),
            'form_number' => $this->form_number,
            'student_id' => $this->student_id,
            'prefect_id' => $this->prefect_id,
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
            'user' => UserResource::make($this->whenLoaded('user')),
            'prefect' => UserResource::make($this->whenLoaded('prefect')),
            'revisions' => AbsenceRevisionResource::collection($this->whenLoaded('revisions')),
            'school_year_semester' => SchoolYearSemesterResource::make($this->schoolYearSemester()),
            'confirmed_school_year_semester' => SchoolYearSemesterResource::make($this->confirmedSchoolYearSemester()),
            'rejected_school_year_semester' => SchoolYearSemesterResource::make($this->rejectedSchoolYearSemester()),
            'revoked_school_year_semester' => SchoolYearSemesterResource::make($this->revokedSchoolYearSemester()),
        ];
    }
}
