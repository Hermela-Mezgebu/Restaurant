<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestaurantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'cuisine_type' => $this->cuisine_type,
            'price_range' => $this->price_range,
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'zip' => $this->zip,
            'phone' => $this->phone,
            'email' => $this->email,
            'hours' => $this->hours,
            'photos' => $this->photos,
            'is_active' => $this->is_active,
            'approved' => $this->approved,
            'menu_items' => MenuItemResource::collection($this->whenLoaded('menuItems')),
            'reviews_count' => $this->when($this->reviews_count !== null, $this->reviews_count),
            'average_rating' => $this->when($this->reviews_avg_rating !== null, round($this->reviews_avg_rating, 1)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
