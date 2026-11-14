<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use App\Http\Resources\System\ProgramResource;
use App\Http\Resources\System\SchoolYearResource;
use Illuminate\Http\Request;

/**
 * Enrollment as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class EnrollmentResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'program_id' => $this->field('program_id'),
            'school_year_id' => $this->field('school_year_id'),
            'semester' => $this->field('semester'),
            'year_level' => $this->field('year_level'),
            'status' => $this->field('status'),
            'dropped_at' => $this->field('dropped_at'),
            'student' => UserResource::make($this->whenLoaded('student')),
            'program' => ProgramResource::make($this->whenLoaded('program')),
            'school_year' => SchoolYearResource::make($this->whenLoaded('schoolYear')),
        ];
    }
}
