<?php

namespace App\Http\Resources\AbsentForm;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * AbsenceRevision as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class AbsenceRevisionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'reason' => $this->field('reason'),
            'date_from' => $this->field('date_from'),
            'date_to' => $this->field('date_to'),
            'evidences' => $this->field('evidences'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
