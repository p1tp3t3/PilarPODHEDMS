<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * Role as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class RoleResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'name' => $this->field('name'),
            'label' => $this->field('label'),
            'is_active' => $this->field('is_active'),
            // Role management list (withCount + isSystem()).
            'linked_count' => $this->field('linked_count'),
            'current_users_count' => $this->field('current_users_count'),
            'is_system' => $this->field('is_system'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
