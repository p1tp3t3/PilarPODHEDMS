<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * CsvImportRowResult as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class CsvImportRowResultResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'batch_id' => $this->field('batch_id'),
            'row_index' => $this->field('row_index'),
            'id_number' => $this->field('id_number'),
            'full_name' => $this->field('full_name'),
            'status' => $this->field('status'),
            'message' => $this->field('message'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
        ];
    }
}
