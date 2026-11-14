<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * ReportFilter as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ReportFilterResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'user_id' => $this->field('user_id'),
            'report_type' => $this->field('report_type'),
            'name' => $this->field('name'),
            'filters' => $this->field('filters'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
