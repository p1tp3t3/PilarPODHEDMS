<?php

namespace App\Http\Resources\Account;

use App\Http\Resources\BaseResource;
use App\Http\Resources\System\ProgramResource;
use Illuminate\Http\Request;

/**
 * Faculty as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class FacultyResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->field('user_id'),
            'program_id' => $this->field('program_id'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
            'program' => ProgramResource::make($this->whenLoaded('program')),
        ];
    }
}
