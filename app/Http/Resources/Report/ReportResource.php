<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Report as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class ReportResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'user_id' => $this->field('user_id'),
            'report_name' => $this->field('report_name'),
            'report_type' => $this->field('report_type'),
            'file_type' => $this->field('file_type'),
            'filters' => $this->field('filters'),
            'created_at' => $this->field('created_at'),
            // Generated reports list.
            'download_url' => $this->field('download_url'),
            'view_url' => $this->field('view_url'),
            'filters_summary' => $this->field('filters_summary'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
