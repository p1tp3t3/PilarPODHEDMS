<?php

namespace App\Http\Requests\AbsentForm;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class CancelAbsentFormRequest extends FormRequest
{
    use RateLimitsSubmissions;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'nullable|string',
        ];
    }
}
