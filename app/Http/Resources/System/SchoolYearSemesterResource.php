<?php

namespace App\Http\Resources\System;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * SchoolYearSemester as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class SchoolYearSemesterResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'school_year_id' => $this->field('school_year_id'),
            'semester' => $this->field('semester'),
            'date_start' => $this->field('date_start'),
            'date_end' => $this->field('date_end'),
            'is_current' => $this->field('is_current'),
            'start_locked' => $this->field('start_locked'),
            'school_year' => SchoolYearResource::make($this->whenLoaded('schoolYear')),
        ];
    }
}
