<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRestaurantRequest;
use App\Http\Resources\RestaurantResource;
use App\Models\Restaurant;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestaurantController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Restaurant::withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->where('is_active', true)
            ->where('approved', true);

        if ($request->has('cuisine')) {
            $query->where('cuisine_type', $request->cuisine);
        }

        if ($request->has('price_range')) {
            $query->where('price_range', $request->price_range);
        }

        if ($request->has('city')) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('cuisine_type', 'like', '%' . $search . '%');
            });
        }

        $restaurants = $query->paginate($request->per_page ?? 15);

        return $this->successResponse(RestaurantResource::collection($restaurants));
    }

    public function show(Restaurant $restaurant): JsonResponse
    {
        $restaurant->load(['menuItems', 'reviews.user']);
        $restaurant->loadCount('reviews');
        $restaurant->loadAvg('reviews', 'rating');

        return $this->successResponse(new RestaurantResource($restaurant));
    }

    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $restaurant = Restaurant::create($request->validated());

        return $this->successResponse(new RestaurantResource($restaurant), 'Restaurant created', 201);
    }

    public function update(Request $request, Restaurant $restaurant): JsonResponse
    {
        $user = auth()->user();

        if (!$user->isAdmin() && $restaurant->staff()->where('id', $user->id)->doesntExist()) {
            return $this->errorResponse('Forbidden. You do not own this restaurant.', 403);
        }

        $restaurant->update($request->all());

        return $this->successResponse(new RestaurantResource($restaurant), 'Restaurant updated');
    }

    public function destroy(Restaurant $restaurant): JsonResponse
    {
        $restaurant->delete();

        return $this->successResponse(null, 'Restaurant deleted');
    }
}
