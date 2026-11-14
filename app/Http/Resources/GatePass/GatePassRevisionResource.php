<?php

namespace App\Http\Resources\GatePass;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * GatePassRevision as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class GatePassRevisionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'reason' => $this->field('reason'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'gatepass' => GatePassResource::make($this->whenLoaded('gatepass')),
        ];
    }
}
