<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Trimmed-down user shape for search/autocomplete results (complaint,
 * referral, appointment, call-in, family, etc.) — only what's needed to
 * display a name, avatar, and program/year level or role, so sensitive
 * fields (username, email, permissions, education background, ...) never
 * leave the server for a plain user search. Role-specific fields
 * (program/enrollments, parent, teaching_staff) are only present for the
 * role they actually apply to, instead of always showing up null.
 *
 * The id always goes out encrypted and id_number is never included; forms
 * post the token back and DecryptEncryptedIds turns it into the plain id.
 */
class UserSearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latestEnrollment = $this->enrollments?->last();
        // A student's photo only goes to those allowed to see it (see
        // User::photoHiddenFrom); everyone else gets the default avatar.
        $hidePhoto = $this->resource->photoHiddenFrom($request->user());
        return array_filter([
            'id' => encrypt_id($this->id),
            'role' => $this->role,
            'last_seen' => $this->last_seen,
            'profile' => $this->whenLoaded('profile', fn () => [
                'first_name' => $this->profile->first_name,
                'middle_name' => $this->profile->middle_name,
                'last_name' => $this->profile->last_name,
                'profile_picture' => $hidePhoto ? null : $this->profile->profile_picture,
                'sex' => $this->profile->sex,
            ]),
            'program' => ($this->role === 'student' && $this->program)
                ? ['name' => $this->program->name]
                : null,
            'enrollments' => ($this->role === 'student' && $latestEnrollment)
                ? [['year_level' => $latestEnrollment->year_level]]
                : null,
            'parent' => ($this->role === 'parent' && $this->parent)
                ? ['parent_role' => $this->parent->parent_role]
                : null,
            'teaching_staff' => ($this->role === 'teaching_staff' && $this->teachingStaff)
                ? [
                    'position' => $this->teachingStaff->position,
                    'program' => $this->teachingStaff->program ? ['name' => $this->teachingStaff->program->name] : null,
                ]
                : null,
            'non_teaching_staff' => ($this->role === 'non_teaching_staff' && $this->nonTeachingStaff)
                ? ['position' => $this->nonTeachingStaff->position]
                : null,
        ], fn ($value) => $value !== null);
    }
}
