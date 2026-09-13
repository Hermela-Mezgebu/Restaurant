<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class RestaurantController extends Controller
{
    /**
     * Display a list of approved restaurants.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Restaurant::query()
            ->where('is_active', true)
            ->where('approved', true);

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%")
                    ->orWhere('cuisine_type', 'ILIKE', "%{$search}%")
                    ->orWhere('address', 'ILIKE', "%{$search}%")
                    ->orWhere('city', 'ILIKE', "%{$search}%")
                    ->orWhere('state', 'ILIKE', "%{$search}%");
            });
        }

        // Cuisine filter
        if ($request->filled('cuisine')) {
            $query->where('cuisine_type', $request->input('cuisine'));
        }

        // City filter
        if ($request->filled('city')) {
            $query->where('city', $request->input('city'));
        }

        // Area filter
        if ($request->filled('area')) {
            $query->where('area', $request->input('area'));
        }

        // Price range filter
        if ($request->filled('price_range')) {
            $query->where('price_range', $request->input('price_range'));
        }

        $restaurants = $query
            ->latest()
            ->paginate($request->integer('per_page', 12));

        return response()->json([
            'success' => true,
            'message' => 'Restaurants retrieved successfully.',
            'data' => $restaurants,
        ]);
    }

    /**
     * Store a new restaurant.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],

            'cuisine_type' => ['nullable', 'string', 'max:100'],
            'price_range' => ['nullable', 'string', 'max:10'],

            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],

            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],

            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],

            'logo' => ['nullable', 'string', 'max:500'],
            'cover_image' => ['nullable', 'string', 'max:500'],
        ]);

        $restaurant = Restaurant::create([
            ...$validated,
            'owner_id' => Auth::id(),
            'slug' => $this->generateUniqueSlug($validated['name']),
            'state' => 'active',
            'approved' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Restaurant submitted successfully and is awaiting admin approval.',
            'data' => $restaurant,
        ], 201);
    }

    /**
     * Display a single approved restaurant.
     */
    public function show(Restaurant $restaurant): JsonResponse
    {
        if (
            $restaurant->state !== 'active' ||
            $restaurant->approved !== 'approved'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Restaurant not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $restaurant,
        ]);
    }

    /**
     * Update restaurant.
     */
    public function update(
        Request $request,
        Restaurant $restaurant
    ): JsonResponse {
        $this->authorizeOwner($restaurant);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],

            'cuisine_type' => ['nullable', 'string', 'max:100'],
            'price_range' => ['nullable', 'string', 'max:10'],

            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],

            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],

            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],

            'logo' => ['nullable', 'string', 'max:500'],
            'cover_image' => ['nullable', 'string', 'max:500'],
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = $this->generateUniqueSlug(
                $validated['name'],
                $restaurant->id
            );
        }

        $restaurant->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Restaurant updated successfully.',
            'data' => $restaurant->fresh(),
        ]);
    }

    /**
     * Delete restaurant.
     */
    public function destroy(Restaurant $restaurant): JsonResponse
    {
        $this->authorizeOwner($restaurant);

        $restaurant->delete();

        return response()->json([
            'success' => true,
            'message' => 'Restaurant deleted successfully.',
        ]);
    }

    /**
     * Generate a unique restaurant slug.
     */
    private function generateUniqueSlug(
        string $name,
        ?int $ignoreId = null
    ): string {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        while (
            Restaurant::where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where('id', '!=', $ignoreId)
                )
                ->exists()
        ) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Make sure the authenticated user owns the restaurant.
     */
    private function authorizeOwner(Restaurant $restaurant): void
    {
        abort_unless(
            $restaurant->owner_id === Auth::id(),
            403,
            'You are not authorized to manage this restaurant.'
        );
    }

    /**
     * Get real table availability for a restaurant.
     *
     * Returns real restaurant table IDs for available reservation times.
     */
    public function availability(
        Request $request,
        Restaurant $restaurant
    ): JsonResponse {
        $validated = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
            'party_size' => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        $date = $validated['date'];
        $partySize = (int) $validated['party_size'];

        /*
         * Available reservation times.
         * These use 24-hour HH:mm format.
         */
        $times = [
            '11:30',
            '12:00',
            '12:30',
            '13:00',
            '13:30',
            '18:00',
            '18:30',
            '19:00',
            '19:30',
            '20:00',
            '20:30',
            '21:00',
        ];

        /*
         * Get tables belonging to this restaurant that:
         *
         * - are currently available
         * - have enough capacity for the requested party
         */
        $tables = RestaurantTable::query()
            ->where('restaurant_id', $restaurant->id)
            ->where('status', 'available')
            ->where('capacity', '>=', $partySize)
            ->orderBy('capacity')
            ->orderBy('id')
            ->get();

        $slots = [];

        foreach ($times as $time) {
            /*
             * Find tables already reserved for this exact
             * restaurant, date and time.
             */
            $reservedTableIds = Reservation::query()
                ->where('restaurant_id', $restaurant->id)
                ->where('reservation_date', $date)
                ->where('reservation_time', $time)
                ->whereIn('status', [
                    'pending',
                    'confirmed',
                    'seated',
                ])
                ->whereNotNull('table_id')
                ->pluck('table_id')
                ->map(fn ($id) => (int) $id)
                ->toArray();

            /*
             * Find the smallest suitable table that is not reserved.
             */
            $availableTable = $tables->first(
                function (RestaurantTable $table) use ($reservedTableIds) {
                    return !in_array(
                        (int) $table->id,
                        $reservedTableIds,
                        true
                    );
                }
            );

            /*
             * Count all suitable tables that remain available.
             */
            $availableTableCount = $tables
                ->filter(function (RestaurantTable $table) use ($reservedTableIds) {
                    return !in_array(
                        (int) $table->id,
                        $reservedTableIds,
                        true
                    );
                })
                ->count();

            if ($availableTable) {
                $slots[] = [
                    'time' => $time,
                    'available' => true,
                    'available_tables' => $availableTableCount,
                    'table_id' => (int) $availableTable->id,
                    'table_number' => $availableTable->table_number,
                    'capacity' => (int) $availableTable->capacity,
                ];
            } else {
                $slots[] = [
                    'time' => $time,
                    'available' => false,
                    'available_tables' => 0,
                    'table_id' => null,
                    'table_number' => null,
                    'capacity' => null,
                ];
            }
        }

        $hasAvailability = collect($slots)
            ->contains('available', true);

        return response()->json([
            'success' => true,
            'message' => 'Available tables retrieved successfully.',
            'data' => [
                'restaurant_id' => $restaurant->id,
                'date' => $date,
                'party_size' => $partySize,
                'available' => $hasAvailability,
                'slots' => $slots,
            ],
        ]);
    }
}
