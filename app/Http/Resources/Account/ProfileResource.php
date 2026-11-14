<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * A person's profile in lists, cards and headers: just their name, photo
 * and sex (for the default avatar). The personal details are only in
 * ProfileDetailResource.
 */
class ProfileResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->field('user_id'),
            'first_name' => $this->field('first_name'),
            'middle_name' => $this->field('middle_name'),
            'last_name' => $this->field('last_name'),
            'suffix' => $this->field('suffix'),
            'profile_picture' => $this->field('profile_picture'),
            'sex' => $this->field('sex'),
        ];
    }
}
