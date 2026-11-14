<?php

namespace App\Http\Resources\Family;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * Family as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class FamilyResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'family_code' => $this->field('family_code'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
