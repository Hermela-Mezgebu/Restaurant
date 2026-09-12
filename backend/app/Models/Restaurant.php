<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Restaurant extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'cuisine_type',
        'price_range',
        'phone',
        'email',
        'website',
        'address',
        'city',
        'area',
        'latitude',
        'longitude',
        'logo',
        'cover_image',
        'state',
        'approved',
        'rejection_reason',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /**
     * Restaurant owner / manager.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Restaurant menu items.
     */
    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'restaurant_id');
    }

    /**
     * Restaurant reviews.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'restaurant_id');
    }

    /**
     * Restaurant tables.
     */
    public function tables(): HasMany
    {
        return $this->hasMany(RestaurantTable::class, 'restaurant_id');
    }

    /**
     * Restaurant reservations.
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'restaurant_id');
    }
}
