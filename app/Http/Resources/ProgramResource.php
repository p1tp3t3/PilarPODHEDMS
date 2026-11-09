<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProgramResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'encrypted_id' => encrypt_id($this->id),
            'name' => $this->name,
            'description' => $this->description,
            'color_code' => $this->color_code,
            'logo' => $this->logo,
            'created_at' => $this->created_at,
            'program_head' => ProgramHeadResource::make($this->whenLoaded('programHead')),
            'users_count' => ($this->students_count ?? 0) + ($this->faculty_count ?? 0) + ($this->program_head_count ?? 0),
            'archived_at' => $this->archived_at,
            'has_records' => (bool) ($this->has_records ?? false),
        ];
    }
}
