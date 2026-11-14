<?php

namespace App\Http\Resources\Complaint;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\Violation\ViolationResource;
use Illuminate\Http\Request;

/**
 * ComplaintSubject as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ComplaintSubjectResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'complaint_id' => $this->field('complaint_id'),
            'student_id' => $this->field('student_id'),
            // The prefect's remark: only the prefect sees it (as on the model).
            'incident_summary' => $this->when(can_see_incident_summary(), fn () => $this->incident_summary),
            'encrypted_id' => $this->field('encrypted_id'),
            'complaint' => ComplaintResource::make($this->whenLoaded('complaint')),
            'violation' => ViolationResource::make($this->whenLoaded('violation')),
            'offenses' => ComplaintSubjectViolationResource::collection($this->whenLoaded('offenses')),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
