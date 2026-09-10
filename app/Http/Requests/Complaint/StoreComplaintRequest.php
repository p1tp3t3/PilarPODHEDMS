<?php

namespace App\Http\Requests\Complaint;

use App\Rules\EnrolledStudent;
use Illuminate\Foundation\Http\FormRequest;

class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'complainant' => 'nullable|integer|exists:users,id',
            'complainant_name' => 'nullable|string',
            'incident_id' => 'nullable|integer|exists:violation,id',
            'complaint_description' => 'required|string',
            'student_subjects' => 'required|array|min:1',
            'student_subjects.*' => ['integer', 'exists:users,id', new EnrolledStudent],
            'evidence' => 'nullable|array',
            'evidence.*' => 'file|max:10240',
        ];
    }
}
