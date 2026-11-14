<?php

namespace App\Http\Resources\Family;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * FamilyMember as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class FamilyMemberResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'family_id' => $this->field('family_id'),
            'encrypted_id' => $this->field('encrypted_id'),
            'family' => FamilyResource::make($this->whenLoaded('family')),
        ];
    }
}
