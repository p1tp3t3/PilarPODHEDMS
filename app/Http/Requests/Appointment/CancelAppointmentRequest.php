<?php

namespace App\Http\Requests\Appointment;

use Illuminate\Foundation\Http\FormRequest;

class CancelAppointmentRequest extends FormRequest
{
    // Only the prefect cancels appointments.
    public function authorize(): bool
    {
        return $this->user()?->role === 'sub_admin';
    }

    public function rules(): array
    {
        return [
            'appointment_id' => 'required|integer|exists:appointment,id',
        ];
    }
}
