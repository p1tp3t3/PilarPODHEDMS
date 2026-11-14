<?php

namespace App\Http\Resources\Violation;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * Penalty as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class PenaltyResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'ref_number' => $this->field('ref_number'),
            'name' => $this->field('name'),
            'description' => $this->field('description'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
