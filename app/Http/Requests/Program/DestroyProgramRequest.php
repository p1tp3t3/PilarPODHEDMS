<?php

namespace App\Http\Requests\Program;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class DestroyProgramRequest extends FormRequest
{
    use RateLimitsSubmissions;

    /**
     * Route already gates this to super_admin via the 'role' middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => 'required|integer|exists:program,id',
        ];
    }
}
