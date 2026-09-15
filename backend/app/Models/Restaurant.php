<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Restaurant extends Model
{
    protected $fillable = [
        'name',
        'description',
        'cuisine_type',
        'price_range',
        'address',
        'city',
        'state',
        'zip',
        'phone',
        'email',
        'hours',
        'photos',
        'is_active',
        'approved',
    ];

    protected function casts(): array
    {
        return [
            'hours' => 'array',
            'photos' => 'array',
            'is_active' => 'boolean',
            'approved' => 'boolean',
        ];
    }

    public function tables(): HasMany
    {
        return $this->hasMany(RestaurantTable::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(User::class)->where('role', 'staff');
    }
}
