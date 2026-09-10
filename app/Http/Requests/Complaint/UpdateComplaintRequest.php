<?php

namespace App\Http\Requests\Complaint;

use Illuminate\Foundation\Http\FormRequest;

class UpdateComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'incident_id' => 'nullable|integer|exists:violation,id',
            'complaint_description' => 'required|string',
            'student_subjects' => 'required|array|min:1',
            'student_subjects.*' => 'integer|exists:users,id',
            'evidence' => 'nullable|array',
            'evidence.*' => 'nullable|file|max:10240',
            'hidden_evidence_files' => 'nullable|string',
        ];
    }
}
