<?php

namespace App\Http\Requests\Appointment;

use App\Rules\EnrolledStudent;
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
            'date_appoint' => 'required|date',
            'time_start' => 'required',
            'reason' => 'nullable|string',
        ];
    }
}
