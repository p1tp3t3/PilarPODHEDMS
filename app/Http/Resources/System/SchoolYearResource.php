<?php

namespace App\Http\Resources\System;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\EnrollmentResource;
use Illuminate\Http\Request;

/**
 * SchoolYear as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class SchoolYearResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'year' => $this->field('year'),
            // School Year page's "Added" column (lists select only id/year).
            'created_at' => $this->field('created_at'),
            // School year management list.
            'enrollments_count' => $this->field('enrollments_count'),
            'is_current' => $this->field('is_current'),
            'is_past' => $this->field('is_past'),
            'enrollments' => EnrollmentResource::collection($this->whenLoaded('enrollments')),
            'semesters' => SchoolYearSemesterResource::collection($this->whenLoaded('semesters')),
        ];
    }
}
