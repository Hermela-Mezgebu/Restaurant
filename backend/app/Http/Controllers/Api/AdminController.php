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

    /**
     * Get all restaurants for admin management.
     */
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

    /**
     * Get all users for admin management.
     */
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

    /**
     * Approve a restaurant.
     */
    public function approve(Restaurant $restaurant): JsonResponse
    {
        $restaurant->approved = true;
        $restaurant->is_active = true;
        $restaurant->save();

        return $this->successResponse(
            $restaurant->fresh(),
            'Restaurant approved successfully'
        );
    }

    /**
     * Suspend a user.
     */
    public function suspend(User $user): JsonResponse
    {
        // Prevent administrators from suspending another admin.
        if ($user->isAdmin()) {
            return $this->errorResponse(
                'Admin users cannot be suspended.',
                422
            );
        }

        // Explicitly update the account status.
        $user->is_active = false;
        $user->save();

        // Reload the user from the database.
        $user->refresh();

        return $this->successResponse(
            $user,
            'User suspended successfully'
        );
    }

    /**
     * Get global platform analytics.
     */
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
                'active' => User::where('is_active', true)->count(),
                'suspended' => User::where('is_active', false)->count(),
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