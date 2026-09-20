<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApprovalController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | APPROVALS
    |--------------------------------------------------------------------------
    */

    /**
     * Get pending restaurant registrations.
     */
    public function approvals(): JsonResponse
    {
        $pendingRestaurants = Restaurant::query()
            ->with([
                'owner:id,name,email,phone,role,is_active,created_at',
            ])
            ->where('approved', false)
            ->where('is_active', false)
            ->whereNull('rejection_reason')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Approvals retrieved successfully.',
            'data' => [
                'pending_restaurants' =>
                    $pendingRestaurants,

                'pending_restaurant_count' =>
                    $pendingRestaurants->count(),
            ],
        ]);
    }

    /**
     * Alias for pending approvals.
     */
    public function pendingApprovals(): JsonResponse
    {
        return $this->approvals();
    }

    /**
     * Approve a restaurant and activate its staff owner.
     */
    public function approveRestaurant(
        Restaurant $restaurant
    ): JsonResponse {
        if ($restaurant->approved) {
            return response()->json([
                'success' => false,
                'message' => 'This restaurant is already approved.',
            ], 422);
        }

        if (!$restaurant->owner) {
            return response()->json([
                'success' => false,
                'message' => 'This restaurant does not have a staff owner.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($restaurant) {
                $restaurant->update([
                    'approved' => true,
                    'is_active' => true,
                    'rejection_reason' => null,
                ]);

                $restaurant->owner()->update([
                    'is_active' => true,
                    'restaurant_id' => $restaurant->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' =>
                    'Restaurant approved and staff account activated.',
                'data' => [
                    'restaurant' =>
                        $restaurant->fresh()->load('owner'),
                ],
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' =>
                    'Unable to approve this restaurant.',
            ], 500);
        }
    }

    /**
     * Reject a restaurant registration.
     */
    public function rejectRestaurant(
        Request $request,
        Restaurant $restaurant
    ): JsonResponse {
        $validated = $request->validate([
            'reason' => [
                'required',
                'string',
                'max:2000',
            ],
        ]);

        try {
            DB::transaction(function () use (
                $restaurant,
                $validated
            ) {
                $restaurant->update([
                    'approved' => false,
                    'is_active' => false,
                    'rejection_reason' =>
                        $validated['reason'],
                ]);

                if ($restaurant->owner) {
                    $restaurant->owner()->update([
                        'is_active' => false,
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' =>
                    'Restaurant registration rejected.',
                'data' => [
                    'restaurant' =>
                        $restaurant->fresh()->load('owner'),
                ],
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' =>
                    'Unable to reject this restaurant.',
            ], 500);
        }
    }

    /**
     * Request changes from the applicant.
     */
    public function requestRestaurantChanges(
        Request $request,
        Restaurant $restaurant
    ): JsonResponse {
        $validated = $request->validate([
            'reason' => [
                'required',
                'string',
                'max:2000',
            ],
        ]);

        $restaurant->update([
            'approved' => false,
            'is_active' => false,
            'rejection_reason' =>
                $validated['reason'],
        ]);

        if ($restaurant->owner) {
            $restaurant->owner()->update([
                'is_active' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Changes have been requested from the applicant.',
            'data' => [
                'restaurant' =>
                    $restaurant->fresh()->load('owner'),
            ],
        ]);
    }
}