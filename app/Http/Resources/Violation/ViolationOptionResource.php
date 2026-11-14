<?php

namespace App\Http\Resources\Violation;

use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * A violation as a dropdown option ({ val, label, keywords }); the complaint
 * form reads the first two values as value and label.
 */
class ViolationOptionResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'val' => $this->field('val'),
            'label' => $this->field('label'),
            'keywords' => $this->field('keywords'),
        ];
    }
}
