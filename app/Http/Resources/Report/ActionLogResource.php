<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Complaint\ComplaintResource;
use App\Http\Resources\Account\UserResource;
use Illuminate\Http\Request;

/**
 * Faithful pass-through of the ActionLog model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class ActionLogResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $parsed = $this->detailsParsed();

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'action_type' => $this->action_type,
            'details' => $this->details,
            'details_summary' => $parsed['summary'],
            'details_changes' => $parsed['changes'],
            'created_at' => $this->created_at,
            'user' => UserResource::make($this->whenLoaded('user')),
        ];
    }
}
