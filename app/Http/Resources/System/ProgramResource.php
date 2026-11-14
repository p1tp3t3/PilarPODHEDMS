<?php

namespace App\Http\Resources\System;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * A program as most pages show it: code, name, color and logo. The Programs
 * management pages use ProgramDetailResource.
 */
class ProgramResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            // id, code, name first: some dropdowns read an item's first two values.
            'id' => $this->field('id'),
            'code' => $this->field('code'),
            'name' => $this->field('name'),
            'color_code' => $this->field('color_code'),
            // A program head's profile shows their programs' logos.
            'logo' => $this->field('logo'),
        ];
    }
}
