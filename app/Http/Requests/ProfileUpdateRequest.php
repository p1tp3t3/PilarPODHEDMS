<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isStudent = $this->input('user_type') === 'student';

        return array_merge([

            // Common user fields
            'user_id' => 'required|exists:users,user_id',
            'user_type' => 'required|in:student,parent',

        ], $isStudent ? $this->studentFields() : []);
    }

    private function studentFields(): array
    {
        return [
            'date_of_birth' => 'required|date',
            'religion' => 'required|string',
            'citizenship' => 'required|string',
            'civil_status' => 'required|string',

            // Address
            'current_place' => 'required|string',
            'current_city' => 'required|string',
            'current_province' => 'required|string',
            'current_zipcode' => 'required|string',

            'permanent_place' => 'required|string',
            'permanent_city' => 'required|string',
            'permanent_province' => 'required|string',
            'permanent_zipcode' => 'required|string',

            // Educational background (nested fields)
            'data.sh_school_name' => 'required|string',
            'data.sh_school_address' => 'required|string',
            'data.sh_year_graduated' => 'required|string',

            // Fixed server-side (EducationBackground::CURRENT_SCHOOL_*).
            'data.college_school_name' => 'nullable|string',
            'data.college_school_address' => 'nullable|string',
            'data.college_year_graduated' => 'nullable|string',
            'data.college_program' => 'required|string',
        ];
    }
}
