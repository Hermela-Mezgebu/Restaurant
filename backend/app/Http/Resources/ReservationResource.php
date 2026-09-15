<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'restaurant_id' => $this->restaurant_id,
            'table_id' => $this->table_id,
            'party_size' => $this->party_size,
            'reservation_date' => $this->reservation_date?->format('Y-m-d'),
            'reservation_time' => $this->reservation_time,
            'status' => $this->status,
            'notes' => $this->notes,
            'special_requests' => $this->special_requests,
            'user' => new UserResource($this->whenLoaded('user')),
            'table' => new JsonResource($this->whenLoaded('table')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
