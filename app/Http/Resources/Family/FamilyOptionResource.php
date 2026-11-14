<?php

namespace App\Http\Resources\Family;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/** A family as a search result (Join Family): its encrypted id and code. */
class FamilyOptionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => encrypt_id($this->id),
            'family_code' => $this->field('family_code'),
        ];
    }
}
