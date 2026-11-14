<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * Position as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class PositionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'name' => $this->field('name'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
