<?php

namespace App\Http\Resources\Appointment;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Faithful pass-through of the Appointment model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class AppointmentResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            'appointment_number' => $this->appointment_number,
            'user_id' => $this->user_id,
            'date_time_appoint' => $this->date_time_appoint,
            'appointment_status' => $this->appointment_status,
            'attendance_status' => $this->attendance_status,
            'rejected_reason' => $this->rejected_reason,
            'confirmed_at' => $this->confirmed_at,
            'description' => $this->description,
            'archived_at' => $this->field('archived_at'),
            'created_at' => $this->field('created_at'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
