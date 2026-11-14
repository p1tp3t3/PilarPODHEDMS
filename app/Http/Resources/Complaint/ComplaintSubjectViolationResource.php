<?php

namespace App\Http\Resources\Complaint;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\Violation\ViolationResource;
use Illuminate\Http\Request;

/**
 * ComplaintSubjectViolation as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ComplaintSubjectViolationResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'complaint_id' => $this->field('complaint_id'),
            'student_id' => $this->field('student_id'),
            'violation_id' => $this->field('violation_id'),
            // Student violation page: the complaint to open, and which
            // offense this was with its penalty.
            'complaint_key' => $this->field('complaint_key'),
            'occurrence' => $this->field('occurrence'),
            'penalty' => $this->field('penalty'),
            // Reports: the top offenders (COUNT per student).
            'total_offenses' => $this->field('total_offenses'),
            'encrypted_id' => $this->field('encrypted_id'),
            'complaint' => ComplaintResource::make($this->whenLoaded('complaint')),
            'violation' => ViolationResource::make($this->whenLoaded('violation')),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
