<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'restaurant_id' => 'required|exists:restaurants,id',
            'table_id' => 'nullable|exists:restaurant_tables,id',
            'party_size' => 'required|integer|min:1|max:50',
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required|date_format:H:i',
            'notes' => 'nullable|string|max:500',
            'special_requests' => 'nullable|string|max:500',
        ];
    }
}
