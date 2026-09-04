<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\User;
use App\Models\Reservation;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    use ApiResponse;

    public function restaurants(Request $request): JsonResponse
    {
        $restaurants = Restaurant::withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->withCount('tables')
            ->withCount('reservations')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return $this->successResponse($restaurants);
    }

    public function users(Request $request): JsonResponse
    {
        $users = User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'phone',
                'restaurant_id',
                'created_at',
                'is_active',
            ])
            ->with('restaurant:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return $this->successResponse($users);
    }

    public function approve(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update([
            'approved' => true,
            'is_active' => true,
        ]);

        return $this->successResponse(
            $restaurant->fresh(),
            'Restaurant approved successfully'
        );
    }

    public function suspend(User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            return $this->errorResponse(
                'Admin users cannot be suspended.',
                422
            );
        }

        $user->update([
            'is_active' => false,
        ]);

        return $this->successResponse(
            $user->fresh(),
            'User suspended successfully'
        );
    }

    public function analytics(): JsonResponse
    {
        $totalUsers = User::count();
        $totalRestaurants = Restaurant::count();
        $approvedRestaurants = Restaurant::where('approved', true)->count();
        $pendingRestaurants = Restaurant::where('approved', false)->count();

        $totalReservations = Reservation::count();
        $pendingReservations = Reservation::where('status', 'pending')->count();
        $confirmedReservations = Reservation::where('status', 'confirmed')->count();
        $completedReservations = Reservation::where('status', 'completed')->count();
        $cancelledReservations = Reservation::where('status', 'cancelled')->count();

        return $this->successResponse([
            'users' => [
                'total' => $totalUsers,
                'diners' => User::where('role', 'diner')->count(),
                'staff' => User::where('role', 'staff')->count(),
                'admins' => User::where('role', 'admin')->count(),
            ],

            'restaurants' => [
                'total' => $totalRestaurants,
                'approved' => $approvedRestaurants,
                'pending' => $pendingRestaurants,
            ],

            'reservations' => [
                'total' => $totalReservations,
                'pending' => $pendingReservations,
                'confirmed' => $confirmedReservations,
                'completed' => $completedReservations,
                'cancelled' => $cancelledReservations,
            ],
        ]);
    }
}