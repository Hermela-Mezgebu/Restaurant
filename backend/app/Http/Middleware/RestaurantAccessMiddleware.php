<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestaurantAccessMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Admins can access any restaurant.
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Staff must belong to a restaurant.
        if (!$user->isStaff() || !$user->restaurant_id) {
            return response()->json([
                'message' => 'You are not assigned to a restaurant.',
            ], 403);
        }

        // Get restaurant ID from the route.
        $restaurant = $request->route('restaurant');

        // Route model binding may give us a Restaurant model.
        if (is_object($restaurant)) {
            $restaurantId = $restaurant->id;
        } else {
            $restaurantId = (int) $restaurant;
        }

        if ((int) $user->restaurant_id !== (int) $restaurantId) {
            return response()->json([
                'message' => 'You do not have access to this restaurant.',
            ], 403);
        }

        return $next($request);
    }
}