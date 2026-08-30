<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RestaurantResource;
use App\Http\Resources\UserResource;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    use ApiResponse;

    public function restaurants(Request $request): JsonResponse
    {
        $query = Restaurant::withCount('reviews')->withAvg('reviews', 'rating');

        if ($request->has('pending_approval') && $request->boolean('pending_approval')) {
            $query->where('approved', false);
        }

        $restaurants = $query->paginate($request->per_page ?? 15);

        return $this->successResponse(RestaurantResource::collection($restaurants));
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->paginate($request->per_page ?? 15);

        return $this->successResponse(UserResource::collection($users));
    }

    public function approve(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update(['approved' => true]);

        return $this->successResponse(new RestaurantResource($restaurant), 'Restaurant approved');
    }

    public function suspend(User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            return $this->errorResponse('Cannot suspend an admin user.', 422);
        }

        $user->update(['role' => 'diner']);

        return $this->successResponse(new UserResource($user), 'User suspended');
    }

    public function analytics(): JsonResponse
    {
        $totalUsers = User::count();
        $totalRestaurants = Restaurant::count();
        $totalReservations = Reservation::count();
        $pendingApprovals = Restaurant::where('approved', false)->count();

        $reservationsByMonth = Reservation::selectRaw("
                EXTRACT(YEAR FROM reservation_date) as year,
                EXTRACT(MONTH FROM reservation_date) as month,
                COUNT(*) as total
            ")
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => [
                'year' => (int) $item->year,
                'month' => (int) $item->month,
                'total' => (int) $item->total,
            ]);

        $popularCuisines = Restaurant::selectRaw('cuisine_type, COUNT(*) as total')
            ->where('approved', true)
            ->groupBy('cuisine_type')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return $this->successResponse([
            'total_users' => $totalUsers,
            'total_restaurants' => $totalRestaurants,
            'total_reservations' => $totalReservations,
            'pending_approvals' => $pendingApprovals,
            'reservations_by_month' => $reservationsByMonth,
            'popular_cuisines' => $popularCuisines,
        ]);
    }
}
