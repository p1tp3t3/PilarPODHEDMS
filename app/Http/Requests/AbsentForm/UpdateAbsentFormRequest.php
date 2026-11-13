<?php

namespace App\Http\Requests\AbsentForm;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAbsentFormRequest extends FormRequest
{
    use RateLimitsSubmissions;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'reason' => 'required|array|min:1',
            'evidence' => 'nullable|array',
            'evidence.*' => 'nullable|file|mimes:jpg,jpeg,png|max:2048',
            'hidden_evidence_files' => 'nullable|string',
        ];
    }
}
