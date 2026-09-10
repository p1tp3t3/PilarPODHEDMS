<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Deliberately a faithful pass-through of the Complaint model's existing
 * shape (including whichever relations the caller eager-loaded) rather than
 * a redesigned contract — the frontend already depends on this exact shape
 * in several places, and there's no browser available in this environment
 * to catch a silently broken page if the shape changed.
 */
class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'complaint_number' => $this->complaint_number,
            'case_number' => $this->case_number,
            'complainant_name' => $this->complainant_name,
            'complainant_id' => $this->complainant_id,
            'incident_id' => $this->incident_id,
            'complaint_description' => $this->complaint_description,
            'incident_summary' => $this->incident_summary,
            'complaint_evidences' => $this->complaint_evidences,
            'rejected_reason' => $this->rejected_reason,
            'rejected_at' => $this->rejected_at,
            'revoked_at' => $this->revoked_at,
            'edited_at' => $this->edited_at,
            'confirmed_at' => $this->confirmed_at,
            'complaint_status' => $this->complaint_status,
            'resolved_at' => $this->resolved_at,
            'archived_at' => $this->archived_at,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user'),
            'subject' => $this->whenLoaded('subject'),
            'complaintSubject' => $this->whenLoaded('complaintSubject'),
            'complaintSubjectViolation' => $this->whenLoaded('complaintSubjectViolation'),
            'violation' => $this->whenLoaded('violation'),
            'revisions' => $this->whenLoaded('revisions'),
            'context_analysis' => $this->when(isset($this->context_analysis), $this->context_analysis),
        ];
    }
}
