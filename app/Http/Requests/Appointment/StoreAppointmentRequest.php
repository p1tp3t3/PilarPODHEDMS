<?php

namespace App\Http\Requests\Appointment;

use App\Rules\EnrolledStudent;
use App\Rules\WithinAppointmentHours;
use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Only a student can be scheduled for an appointment — a parent
            // is no longer a valid recipient.
            'user_id' => ['required', 'integer', 'exists:users,id', new EnrolledStudent],
            'date_appoint' => 'required|date|after_or_equal:today',
            'time_start' => ['required', 'date_format:H:i', new WithinAppointmentHours],
            'reason' => 'nullable|string',
        ];
    }
}
