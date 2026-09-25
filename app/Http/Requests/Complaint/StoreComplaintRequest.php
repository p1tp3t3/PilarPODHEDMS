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
            // 40MB accommodates a 3-minute video (duration itself is only
            // checked client-side — there's no video-inspection library in
            // this project to verify it server-side).
            'evidence.*' => 'nullable|file|max:40960|mimes:jpeg,png,jpg,mp4',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $videoCount = collect($this->file('evidence', []))
                ->filter(fn ($file) => $file && str_starts_with((string) $file->getMimeType(), 'video/'))
                ->count();

            if ($videoCount > 2) {
                $validator->errors()->add('evidence', 'You can only upload up to 2 videos.');
            }
        });
    }
}
