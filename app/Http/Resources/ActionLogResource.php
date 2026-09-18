<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Faithful pass-through of the ActionLog model's existing shape (see
 * ComplaintResource for why this isn't a redesigned contract).
 */
class ActionLogResource extends JsonResource
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
            'user' => $this->whenLoaded('user'),
        ];
    }
}
