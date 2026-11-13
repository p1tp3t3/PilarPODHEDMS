<?php

namespace App\Http\Requests\Appointment;

use App\Http\Requests\Concerns\RateLimitsSubmissions;
use Illuminate\Foundation\Http\FormRequest;

class CancelAppointmentRequest extends FormRequest
{
    use RateLimitsSubmissions;

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
