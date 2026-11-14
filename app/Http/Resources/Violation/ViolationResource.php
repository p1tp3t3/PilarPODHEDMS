<?php

namespace App\Http\Resources\Violation;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use Illuminate\Http\Request;

/**
 * Violation as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ViolationResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'violation_name' => $this->field('violation_name'),
            'keywords' => $this->field('keywords'),
            'offense_status' => $this->field('offense_status'),
            'archived_at' => $this->field('archived_at'),
            // Violation management: Archive (has records) vs Delete.
            'has_records' => $this->field('has_records'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'complaints' => ComplaintResource::collection($this->whenLoaded('complaints')),
            'penalties' => ViolationPenaltyResource::collection($this->whenLoaded('penalties')),
        ];
    }
}
