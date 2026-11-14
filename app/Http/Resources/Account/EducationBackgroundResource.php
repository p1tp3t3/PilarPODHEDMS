<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * EducationBackground as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class EducationBackgroundResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'student_id' => $this->field('student_id'),
            'education_type' => $this->field('education_type'),
            'school_name' => $this->field('school_name'),
            'school_address' => $this->field('school_address'),
            'year_graduated' => $this->field('year_graduated'),
            'program' => $this->field('program'),
            'date_attended' => $this->field('date_attended'),
            'year_level' => $this->field('year_level'),
            'transferee' => $this->field('transferee'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
