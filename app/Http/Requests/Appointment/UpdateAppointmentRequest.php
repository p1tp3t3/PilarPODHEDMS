<?php

namespace App\Http\Requests\Appointment;

use App\Rules\WithinAppointmentHours;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer|exists:users,id',
            'date_appoint' => 'required|date|after_or_equal:today',
            'time_start' => ['required', 'date_format:H:i', new WithinAppointmentHours],
            'reason' => 'nullable|string',
        ];
    }
}
