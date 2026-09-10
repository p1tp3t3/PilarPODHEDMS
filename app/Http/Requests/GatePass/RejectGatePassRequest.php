<?php

namespace App\Http\Requests\GatePass;

use Illuminate\Foundation\Http\FormRequest;

class RejectGatePassRequest extends FormRequest
{
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
