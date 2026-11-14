<?php

namespace App\Http\Resources\Appointment;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * PrefectAvailability as sent to the frontend: only the fields the pages use. A field
 * a query didn't select (or a count/flag a controller didn't add) is left
 * out; relations appear only when loaded.
 */
class PrefectAvailabilityResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->field('id'),
            'user_id' => $this->field('user_id'),
            'day_of_week' => $this->field('day_of_week'),
            'start_time' => $this->field('start_time'),
            'end_time' => $this->field('end_time'),
            'created_at' => $this->field('created_at'),
            'encrypted_id' => $this->field('encrypted_id'),
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
