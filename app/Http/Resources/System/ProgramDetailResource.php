<?php

namespace App\Http\Resources\System;

use App\Http\Resources\Account\ProgramHeadResource;
use Illuminate\Http\Request;

/**
 * A program on the Programs management pages (list, View users): adds its
 * encrypted id, dates, head, user count and whether it has records (Archive vs
 * Delete).
 */
class ProgramDetailResource extends ProgramResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'encrypted_id' => $this->when(isset($this->id), fn () => encrypt_id($this->id)),
            'created_at' => $this->field('created_at'),
            'archived_at' => $this->field('archived_at'),
            'program_head' => ProgramHeadResource::make($this->whenLoaded('programHead')),
            'users_count' => $this->when(isset($this->students_count), fn () => ($this->students_count ?? 0) + ($this->faculty_count ?? 0) + ($this->program_head_count ?? 0)),
            'has_records' => $this->when(isset($this->has_records), fn () => (bool) $this->has_records),
        ];
    }
}
