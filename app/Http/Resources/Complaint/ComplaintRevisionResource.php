<?php

namespace App\Http\Resources\Complaint;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * ComplaintRevision as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ComplaintRevisionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'complaint_id' => $this->field('complaint_id'),
            'incident' => $this->field('incident'),
            'complaint_description' => $this->field('complaint_description'),
            'complaint_evidences' => $this->field('complaint_evidences'),
            'subjects' => $this->field('subjects'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'complaint' => ComplaintResource::make($this->whenLoaded('complaint')),
        ];
    }
}
