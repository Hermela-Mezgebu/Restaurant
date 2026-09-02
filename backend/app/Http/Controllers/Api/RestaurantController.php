<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
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
            ->where('status', 'active')
            ->where('approval_status', 'approved');

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%")
                    ->orWhere('cuisine', 'ILIKE', "%{$search}%")
                    ->orWhere('area', 'ILIKE', "%{$search}%")
                    ->orWhere('city', 'ILIKE', "%{$search}%");
            });
        }

        // Cuisine filter
        if ($request->filled('cuisine')) {
            $query->where('cuisine', $request->input('cuisine'));
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

            'cuisine' => ['nullable', 'string', 'max:100'],
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
            'status' => 'active',
            'approval_status' => 'pending',
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
            $restaurant->status !== 'active' ||
            $restaurant->approval_status !== 'approved'
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

            'cuisine' => ['nullable', 'string', 'max:100'],
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
}