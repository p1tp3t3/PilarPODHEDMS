<?php

namespace App\Http\Requests\GatePass;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class ApproveGatePassRequest extends FormRequest
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
            'expiration_date' => 'required|date',
            'allow_to' => 'nullable',
        ];
    }
}
