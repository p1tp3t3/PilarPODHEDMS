<?php

namespace App\Http\Resources\Account;

use Illuminate\Http\Request;

/**
 * A user with their account and personal details (email, username, the
 * full profile) — only for the profile page, Edit Profile and account
 * settings. Everywhere else uses UserResource.
 */
class UserDetailResource extends UserResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            // Left out where hidden (a student viewing a sibling's profile).
            'username' => $this->field('username'),
            'email' => $this->field('email'),
            'profile' => ProfileDetailResource::make($this->whenLoaded('profile')),
        ]);
    }
}
