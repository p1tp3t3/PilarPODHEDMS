<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the Appointment model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'date_time_appoint' => $this->date_time_appoint,
            'appointment_status' => $this->appointment_status,
            'attendance_status' => $this->attendance_status,
            'rejected_reason' => $this->rejected_reason,
            'confirmed_at' => $this->confirmed_at,
            'description' => $this->description,
            'user' => $this->whenLoaded('user'),
        ];
    }
}
