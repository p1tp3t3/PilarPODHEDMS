<?php

namespace App\Http\Resources\Complaint;

use App\Http\Resources\BaseResource;
use App\Http\Resources\System\SchoolYearSemesterResource;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\Violation\ViolationResource;
use Illuminate\Http\Request;

/**
 * Deliberately a faithful pass-through of the Complaint model's existing
 * shape (including whichever relations the caller eager-loaded) rather than
 * a redesigned contract — the frontend already depends on this exact shape
 * in several places, and there's no browser available in this environment
 * to catch a silently broken page if the shape changed.
 */
class ComplaintResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            // Opens this record's PDF in a new tab; null if none or not allowed.
            'pdf_url' => $this->resource->pdfUrl($request->user()),
            'complaint_number' => $this->complaint_number,
            'case_number' => $this->case_number,
            'complainant_name' => $this->complainant_name,
            'complainant_id' => $this->complainant_id,
            'prefect_id' => $this->prefect_id,
            'incident_id' => $this->incident_id,
            'complaint_description' => $this->complaint_description,
            'incident_summary' => can_see_incident_summary() ? $this->incident_summary : null,
            'complaint_evidences' => $this->complaint_evidences,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'revoked_at' => $this->revoked_at,
            'edited_at' => $this->edited_at,
            'confirmed_at' => $this->confirmed_at,
            'complaint_status' => $this->complaint_status,
            'resolved_at' => $this->resolved_at,
            'offense_issued_at' => $this->offense_issued_at,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
            'user' => UserResource::make($this->whenLoaded('user')),
            'prefect' => UserResource::make($this->whenLoaded('prefect')),
            'subject' => UserResource::make($this->whenLoaded('subject')),
            'complaintSubject' => ComplaintSubjectResource::collection($this->whenLoaded('complaintSubject')),
            'complaintSubjectViolation' => ComplaintSubjectViolationResource::collection($this->whenLoaded('complaintSubjectViolation')),
            'violation' => ViolationResource::make($this->whenLoaded('violation')),
            'revisions' => ComplaintRevisionResource::collection($this->whenLoaded('revisions')),
            'school_year_semester' => SchoolYearSemesterResource::make($this->schoolYearSemester()),
            'confirmed_school_year_semester' => SchoolYearSemesterResource::make($this->confirmedSchoolYearSemester()),
            'resolved_school_year_semester' => SchoolYearSemesterResource::make($this->resolvedSchoolYearSemester()),
            'rejected_school_year_semester' => SchoolYearSemesterResource::make($this->rejectedSchoolYearSemester()),
            'revoked_school_year_semester' => SchoolYearSemesterResource::make($this->revokedSchoolYearSemester()),
            'context_analysis' => $this->when(isset($this->context_analysis), $this->context_analysis),
        ];
    }
}
