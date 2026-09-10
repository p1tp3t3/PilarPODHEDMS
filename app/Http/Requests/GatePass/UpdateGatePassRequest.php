<?php

namespace App\Http\Requests\GatePass;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGatePassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string',
        ];
    }
}
