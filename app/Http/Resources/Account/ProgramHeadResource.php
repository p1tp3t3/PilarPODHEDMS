<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use App\Http\Resources\System\ProgramResource;
use Illuminate\Http\Request;

/** A program's head (a program_head row): who heads it, and their account. */
class ProgramHeadResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->user_id,
            'program_id' => $this->program_id,
            'position' => 'program_head',
            'program' => ProgramResource::make($this->whenLoaded('program')),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
