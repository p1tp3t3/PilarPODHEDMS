<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Appointment\AppointmentResource;
use App\Http\Resources\GatePass\GatePassResource;
use App\Http\Resources\Family\ParentsResource;
use App\Http\Resources\System\ProgramResource;
use Illuminate\Http\Request;

/**
 * A user in lists, cards and pickers: who they are (name, photo, role,
 * program / year level or teaching program), not their personal details.
 * Email and the full profile are only in UserDetailResource; the username
 * only goes to the user themselves and the System Admin (account lists).
 */
class UserResource extends BaseResource
{
    /** The user themselves, or the System Admin (who manages accounts). */
    protected function canSeeAccount(Request $request): bool
    {
        $viewer = $request->user();

        return $viewer && ($viewer->id === $this->id || $viewer->role === 'super_admin');
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            // Left out where hidden (a student viewing a sibling's profile).
            'id_number' => $this->field('id_number'),
            'role' => $this->role,
            'username' => $this->when($this->canSeeAccount($request), fn () => $this->field('username')),
            'activate' => $this->activate,
            'last_seen' => $this->last_seen,
            'created_at' => $this->created_at,
            // Students: their program and year level.
            'academic' => $this->academic,
            // Set on the signed-in user by some pages (what they may submit).
            'allow_complaint' => $this->whenHas('allow_complaint'),
            'allow_referral' => $this->whenHas('allow_referral'),
            'allow_absent_form' => $this->whenHas('allow_absent_form'),
            'allow_gatepass' => $this->whenHas('allow_gatepass'),
            'profile' => ProfileResource::make($this->whenLoaded('profile')),
            'program' => ProgramResource::make($this->whenLoaded('program')),
            'enrollments' => EnrollmentResource::collection($this->whenLoaded('enrollments')),
            'teaching' => $this->teaching,
            'non_teaching_staff' => NonTeachingStaffResource::make($this->whenLoaded('nonTeachingStaff')),
            'parent' => ParentsResource::make($this->whenLoaded('parent')),
            'permissions' => UserPermissionResource::make($this->whenLoaded('permissions')),
            'education_background' => EducationBackgroundResource::collection($this->whenLoaded('educationBackground')),
            'gatepass' => GatePassResource::collection($this->whenLoaded('gatepass')),
            'appointment' => AppointmentResource::collection($this->whenLoaded('appointment')),
        ];
    }
}
