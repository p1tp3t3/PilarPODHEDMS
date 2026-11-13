<?php

namespace App\Http\Requests\AbsentForm;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmAbsentFormRequest extends FormRequest
{
    use RateLimitsSubmissions;

    /** Submissions allowed per minute. */
    protected int $perMinute = 30;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'note' => 'nullable|string',
        ];
    }
}
