<?php

namespace App\Http\Resources\Account;

use Illuminate\Http\Request;

/**
 * The full profile (birth date, civil status, addresses, contact number…),
 * only for the pages that show or edit it: the profile page, Edit Profile
 * and account settings (UserDetailResource). Lists use ProfileResource.
 */
class ProfileDetailResource extends ProfileResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'date_of_birth' => $this->field('date_of_birth'),
            'civil_status' => $this->field('civil_status'),
            'religion' => $this->field('religion'),
            'citizenship' => $this->field('citizenship'),
            'current_address' => $this->field('current_address'),
            'permanent_address' => $this->field('permanent_address'),
            'place_of_birth' => $this->field('place_of_birth'),
            // Left out where hidden (a student viewing a sibling's profile).
            'contact_number' => $this->field('contact_number'),
        ];
    }
}
