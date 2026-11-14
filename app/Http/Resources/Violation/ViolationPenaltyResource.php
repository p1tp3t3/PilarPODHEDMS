<?php

namespace App\Http\Resources\Violation;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * ViolationPenalty as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ViolationPenaltyResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'violation_id' => $this->field('violation_id'),
            'occurrence' => $this->field('occurrence'),
            'penalty_id' => $this->field('penalty_id'),
            'encrypted_id' => $this->field('encrypted_id'),
            'violation' => ViolationResource::make($this->whenLoaded('violation')),
            'penalty' => PenaltyResource::make($this->whenLoaded('penalty')),
        ];
    }
}
