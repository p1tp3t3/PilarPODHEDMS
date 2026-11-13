<?php

namespace App\Http\Requests\Appointment;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentSlotRequest extends FormRequest
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
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'slot' => 'required|integer|min:0',
        ];
    }
}
