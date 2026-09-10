<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the User model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract). `password`
 * is already excluded via the model's own $hidden, so the main value here
 * is a single declared contract for every "list of users" endpoint rather
 * than each one hand-rolling its own ->with()/->get() shape.
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'id_number' => $this->id_number,
            'role' => $this->role,
            'username' => $this->username,
            'email' => $this->email,
            'activate' => $this->activate,
            'last_seen' => $this->last_seen,
            'created_at' => $this->created_at,
            'profile' => $this->whenLoaded('profile'),
            'program' => $this->whenLoaded('program'),
            'enrollments' => $this->whenLoaded('enrollments'),
            'teaching_staff' => $this->whenLoaded('teachingStaff'),
            'non_teaching_staff' => $this->whenLoaded('nonTeachingStaff'),
            'parent' => $this->whenLoaded('parent'),
            'permissions' => $this->whenLoaded('permissions'),
            'education_background' => $this->whenLoaded('educationBackground'),
        ];
    }
}
