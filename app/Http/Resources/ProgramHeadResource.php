<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A program's head (a program_head row): who heads it, and their account. */
class ProgramHeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->user_id,
            'program_id' => $this->program_id,
            'position' => 'program_head',
            'program' => $this->whenLoaded('program'),
            'user' => $this->whenLoaded('user'),
        ];
    }
}
