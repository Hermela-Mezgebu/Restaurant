<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\User;
use App\Models\Reservation;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    use ApiResponse;

    /*
    |--------------------------------------------------------------------------
    | RESTAURANTS
    |--------------------------------------------------------------------------
    */

    /**
     * Get pending restaurants.
     */
    public function pending(): JsonResponse
    {
        $restaurants = Restaurant::query()
            ->where('is_active', true)
            ->where('approved', false)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Pending restaurants retrieved successfully.',
            'data' => $restaurants,
        ]);
    }

    /**
     * Get all restaurants for admin management.
     */
    public function restaurants(Request $request): JsonResponse
    {
        $perPage = min(
            max((int) $request->input('per_page', 15), 1),
            100
        );

        $query = Restaurant::query()
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->withCount('tables')
            ->withCount('reservations')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%")
                    ->orWhere('cuisine_type', 'ILIKE', "%{$search}%")
                    ->orWhere('address', 'ILIKE', "%{$search}%")
                    ->orWhere('city', 'ILIKE', "%{$search}%")
                    ->orWhere('state', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->filled('approved')) {
            $query->where(
                'approved',
                filter_var($request->input('approved'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        if ($request->filled('is_active')) {
            $query->where(
                'is_active',
                filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        $restaurants = $query->paginate($perPage);

        return $this->successResponse($restaurants);
    }

    /**
     * Approve a restaurant.
     */
    public function approve(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update([
            'approved' => true,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Restaurant approved successfully.',
            'data' => $restaurant->fresh(),
        ]);
    }

    /**
     * Reject a restaurant.
     */
    public function reject(Restaurant $restaurant): JsonResponse
    {
        $restaurant->update([
            'approved' => false,
            'is_active' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Restaurant rejected successfully.',
            'data' => $restaurant->fresh(),
        ]);
    }

    /**
     * Request changes for a restaurant.
     *
     * There is currently no dedicated changes_requested column
     * in the restaurants table, so this endpoint reports the action
     * without inventing database state.
     */
    public function requestChanges(Restaurant $restaurant): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Changes requested successfully.',
            'data' => $restaurant->fresh(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | USERS
    |--------------------------------------------------------------------------
    */

    /**
     * Get all users for admin management.
     */
    public function users(Request $request): JsonResponse
    {
        $perPage = min(
            max((int) $request->input('per_page', 15), 1),
            100
        );

        $query = User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'phone',
                'restaurant_id',
                'created_at',
                'updated_at',
                'is_active',
            ])
            ->with('restaurant:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('role')) {
            $query->where(
                'role',
                $request->input('role')
            );
        }

        if ($request->filled('is_active')) {
            $query->where(
                'is_active',
                filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%")
                    ->orWhere('phone', 'ILIKE', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage);

        return $this->successResponse($users);
    }

    /**
     * Get restaurant staff.
     */
    public function staff(Request $request): JsonResponse
    {
        $perPage = min(
            max((int) $request->input('per_page', 15), 1),
            100
        );

        $query = User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'phone',
                'restaurant_id',
                'created_at',
                'updated_at',
                'is_active',
            ])
            ->where('role', 'staff')
            ->with('restaurant:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('restaurant_id')) {
            $query->where(
                'restaurant_id',
                $request->integer('restaurant_id')
            );
        }

        if ($request->filled('is_active')) {
            $query->where(
                'is_active',
                filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%")
                    ->orWhere('phone', 'ILIKE', "%{$search}%");
            });
        }

        return $this->successResponse(
            $query->paginate($perPage)
        );
    }

    /**
     * Get one staff member.
     */
    public function staffShow(User $user): JsonResponse
    {
        if ($user->role !== 'staff') {
            return $this->errorResponse(
                'The selected user is not restaurant staff.',
                422
            );
        }

        $user->load('restaurant:id,name');

        return $this->successResponse($user);
    }

    /**
     * Suspend a user.
     */
    public function suspend(User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            return $this->errorResponse(
                'Admin users cannot be suspended.',
                422
            );
        }

        $user->is_active = false;
        $user->save();
        $user->refresh();

        return $this->successResponse(
            $user,
            'User suspended successfully'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN CREATION
    |--------------------------------------------------------------------------
    */

    /**
     * Create another administrator.
     */
    public function storeAdmin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
            ],
        ]);

        $admin = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'admin',
            'restaurant_id' => null,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admin created successfully.',
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'restaurant_id' => $admin->restaurant_id,
                'is_active' => $admin->is_active,
            ],
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | ANALYTICS
    |--------------------------------------------------------------------------
    */

    /**
     * Get global platform analytics.
     */
    public function analytics(): JsonResponse
    {
        $totalUsers = User::count();

        $totalRestaurants = Restaurant::count();
        $approvedRestaurants = Restaurant::where('approved', true)->count();
        $pendingRestaurants = Restaurant::where('approved', false)->count();
        $activeRestaurants = Restaurant::where('is_active', true)->count();

        $totalReservations = Reservation::count();
        $pendingReservations = Reservation::where('status', 'pending')->count();
        $confirmedReservations = Reservation::where('status', 'confirmed')->count();
        $seatedReservations = Reservation::where('status', 'seated')->count();
        $completedReservations = Reservation::where('status', 'completed')->count();
        $cancelledReservations = Reservation::where('status', 'cancelled')->count();
        $declinedReservations = Reservation::where('status', 'declined')->count();

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
                'active' => $activeRestaurants,
            ],

            'reservations' => [
                'total' => $totalReservations,
                'pending' => $pendingReservations,
                'confirmed' => $confirmedReservations,
                'seated' => $seatedReservations,
                'completed' => $completedReservations,
                'cancelled' => $cancelledReservations,
                'declined' => $declinedReservations,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN TABLES
    |--------------------------------------------------------------------------
    */

    /**
     * Get tables across all restaurants.
     *
     * Uses the existing Restaurant -> tables relationship.
     */
    public function tables(Request $request): JsonResponse
    {
        $restaurants = Restaurant::query()
            ->with([
                'tables',
            ])
            ->orderBy('name')
            ->get();

        $tables = $restaurants->flatMap(function ($restaurant) {
            return $restaurant->tables->map(function ($table) use ($restaurant) {
                return [
                    'id' => $table->id,
                    'restaurant_id' => $restaurant->id,
                    'restaurant_name' => $restaurant->name,
                    'table_number' => $table->table_number,
                    'capacity' => $table->capacity,
                    'status' => $table->status,
                    'cuisine' => $table->cuisine ?? null,
                    'approval_status' => $table->approval_status ?? null,
                    'created_at' => $table->created_at,
                    'updated_at' => $table->updated_at,
                ];
            });
        })->values();

        if ($request->filled('restaurant_id')) {
            $restaurantId = $request->integer('restaurant_id');

            $tables = $tables
                ->where('restaurant_id', $restaurantId)
                ->values();
        }

        if ($request->filled('status')) {
            $tables = $tables
                ->where('status', $request->input('status'))
                ->values();
        }

        return response()->json([
            'success' => true,
            'message' => 'Admin tables retrieved successfully.',
            'data' => $tables,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN RESERVATIONS
    |--------------------------------------------------------------------------
    */

    /**
     * Get all reservations for administrators.
     */
    public function reservations(Request $request): JsonResponse
    {
        $perPage = min(
            max((int) $request->input('per_page', 20), 1),
            100
        );

        $query = Reservation::query()
            ->with([
                'user:id,name,email,phone',
                'restaurant:id,name',
                'table:id,restaurant_id,table_number,capacity,status',
            ])
            ->orderByDesc('reservation_date')
            ->orderByDesc('reservation_time');

        if ($request->filled('restaurant_id')) {
            $query->where(
                'restaurant_id',
                $request->integer('restaurant_id')
            );
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->input('status')
            );
        }

        if ($request->filled('date')) {
            $query->whereDate(
                'reservation_date',
                $request->input('date')
            );
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($userQuery) use ($search) {
                    $userQuery
                        ->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('email', 'ILIKE', "%{$search}%");
                })
                ->orWhereHas('restaurant', function ($restaurantQuery) use ($search) {
                    $restaurantQuery->where(
                        'name',
                        'ILIKE',
                        "%{$search}%"
                    );
                });
            });
        }

        return $this->successResponse(
            $query->paginate($perPage)
        );
    }

    /**
     * Get one reservation for administrators.
     */
    public function reservation(Reservation $reservation): JsonResponse
    {
        $reservation->load([
            'user:id,name,email,phone',
            'restaurant:id,name,address,city,state,phone',
            'table:id,restaurant_id,table_number,capacity,status',
        ]);

        return $this->successResponse($reservation);
    }

    /**
     * Update reservation status as administrator.
     */
    public function reservationStatus(
        Request $request,
        Reservation $reservation
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'pending',
                    'confirmed',
                    'declined',
                    'seated',
                    'completed',
                    'cancelled',
                ]),
            ],
        ]);

        $reservation->status = $validated['status'];
        $reservation->save();
        $reservation->refresh();

        return $this->successResponse(
            $reservation->load([
                'user:id,name,email,phone',
                'restaurant:id,name',
                'table:id,restaurant_id,table_number,capacity,status',
            ]),
            'Reservation status updated successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | REPORTS
    |--------------------------------------------------------------------------
    */

    /**
     * Main admin reports endpoint.
     *
     * Supports:
     * 7d
     * 30d
     * 90d
     * 1y
     * all
     */
    public function reports(Request $request): JsonResponse
    {
        $range = $request->input('range', '30d');

        $allowedRanges = [
            '7d',
            '30d',
            '90d',
            '1y',
            'all',
        ];

        if (!in_array($range, $allowedRanges, true)) {
            $range = '30d';
        }

        [$startDate, $endDate] = $this->reportDateRange($range);

        $reservationQuery = Reservation::query();

        if ($startDate && $endDate) {
            $reservationQuery
                ->whereDate('reservation_date', '>=', $startDate)
                ->whereDate('reservation_date', '<=', $endDate);
        }

        $reservations = (clone $reservationQuery)->count();

        $pending = (clone $reservationQuery)
            ->where('status', 'pending')
            ->count();

        $confirmed = (clone $reservationQuery)
            ->where('status', 'confirmed')
            ->count();

        $seated = (clone $reservationQuery)
            ->where('status', 'seated')
            ->count();

        $completed = (clone $reservationQuery)
            ->where('status', 'completed')
            ->count();

        $cancelled = (clone $reservationQuery)
            ->where('status', 'cancelled')
            ->count();

        $declined = (clone $reservationQuery)
            ->where('status', 'declined')
            ->count();

        $covers = (clone $reservationQuery)->sum('party_size');

        $restaurantsQuery = Restaurant::query();

        if ($startDate && $endDate) {
            $restaurantsQuery
                ->whereDate('created_at', '<=', $endDate);
        }

        $restaurants = $restaurantsQuery->count();

        $usersQuery = User::query();

        if ($startDate && $endDate) {
            $usersQuery
                ->whereDate('created_at', '<=', $endDate);
        }

        $users = $usersQuery->count();

        $activeUsers = User::where('is_active', true)->count();
        $activeRestaurants = Restaurant::where('is_active', true)->count();

        $dailyReservations = $this->dailyReservationReport(
            $startDate,
            $endDate
        );

        $topRestaurants = $this->topRestaurantReport(
            $startDate,
            $endDate
        );

        return response()->json([
            'success' => true,
            'message' => 'Reports retrieved successfully.',
            'data' => [
                'range' => $range,

                'period' => [
                    'start' => $startDate?->toDateString(),
                    'end' => $endDate?->toDateString(),
                ],

                'summary' => [
                    'reservations' => $reservations,
                    'covers' => $covers,
                    'pending' => $pending,
                    'confirmed' => $confirmed,
                    'seated' => $seated,
                    'completed' => $completed,
                    'cancelled' => $cancelled,
                    'declined' => $declined,
                ],

                'platform' => [
                    'users' => $users,
                    'active_users' => $activeUsers,
                    'restaurants' => $restaurants,
                    'active_restaurants' => $activeRestaurants,
                ],

                'reservations' => [
                    'total' => $reservations,
                    'pending' => $pending,
                    'confirmed' => $confirmed,
                    'seated' => $seated,
                    'completed' => $completed,
                    'cancelled' => $cancelled,
                    'declined' => $declined,
                    'covers' => $covers,
                    'daily' => $dailyReservations,
                ],

                'top_restaurants' => $topRestaurants,
            ],
        ]);
    }

    /**
     * Reports overview.
     */
    public function reportOverview(Request $request): JsonResponse
    {
        return $this->reports($request);
    }

    /**
     * Restaurant report.
     */
    public function reportRestaurants(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->reportDateRange(
            $request->input('range', '30d')
        );

        $restaurants = Restaurant::query()
            ->withCount([
                'reservations as reservations_count' => function ($query) use ($startDate, $endDate) {
                    if ($startDate && $endDate) {
                        $query
                            ->whereDate('reservation_date', '>=', $startDate)
                            ->whereDate('reservation_date', '<=', $endDate);
                    }
                },
            ])
            ->withCount('tables')
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->orderByDesc('reservations_count')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Restaurant report retrieved successfully.',
            'data' => $restaurants,
        ]);
    }

    /**
     * Reservation report.
     */
    public function reportReservations(Request $request): JsonResponse
    {
        $range = $request->input('range', '30d');

        [$startDate, $endDate] = $this->reportDateRange($range);

        $query = Reservation::query();

        if ($startDate && $endDate) {
            $query
                ->whereDate('reservation_date', '>=', $startDate)
                ->whereDate('reservation_date', '<=', $endDate);
        }

        $data = [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'confirmed' => (clone $query)->where('status', 'confirmed')->count(),
            'seated' => (clone $query)->where('status', 'seated')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
            'declined' => (clone $query)->where('status', 'declined')->count(),
            'covers' => (clone $query)->sum('party_size'),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Reservation report retrieved successfully.',
            'data' => $data,
        ]);
    }

    /**
     * User report.
     */
    public function reportUsers(Request $request): JsonResponse
    {
        $range = $request->input('range', '30d');

        [$startDate, $endDate] = $this->reportDateRange($range);

        $query = User::query();

        if ($startDate && $endDate) {
            $query
                ->whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate);
        }

        return response()->json([
            'success' => true,
            'message' => 'User report retrieved successfully.',
            'data' => [
                'total' => (clone $query)->count(),
                'diners' => (clone $query)->where('role', 'diner')->count(),
                'staff' => (clone $query)->where('role', 'staff')->count(),
                'admins' => (clone $query)->where('role', 'admin')->count(),
                'active' => (clone $query)->where('is_active', true)->count(),
                'suspended' => (clone $query)->where('is_active', false)->count(),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVALS
    |--------------------------------------------------------------------------
    */

    /**
     * Get all approval information.
     */
  /*
|--------------------------------------------------------------------------
| APPROVALS
|--------------------------------------------------------------------------
*/

/**
 * Get all pending restaurant applications.
 */
public function approvals(): JsonResponse
{
    $pendingRestaurants = Restaurant::query()
        ->with([
            'owner:id,name,email,phone,restaurant_id',
        ])
        ->where('approved', false)
        ->where('is_active', false)
        ->latest()
        ->get();

    return response()->json([
        'success' => true,
        'message' => 'Approvals retrieved successfully.',
        'data' => [
            'pending_restaurants' => $pendingRestaurants,
            'pending_restaurant_count' => $pendingRestaurants->count(),
        ],
    ]);
}

/**
 * Get pending restaurant applications.
 */
public function pendingApprovals(): JsonResponse
{
    return $this->approvals();
}

/**
 * Approve restaurant application.
 */
public function approveRestaurant(
    Restaurant $restaurant
): JsonResponse {
    return DB::transaction(function () use ($restaurant) {

        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate approval
        |--------------------------------------------------------------------------
        */

        if ($restaurant->approved && $restaurant->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This restaurant has already been approved.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Get restaurant owner
        |--------------------------------------------------------------------------
        */

        $owner = $restaurant->owner;

        if (!$owner) {
            return response()->json([
                'success' => false,
                'message' =>
                    'This restaurant does not have an owner account.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Approve restaurant
        |--------------------------------------------------------------------------
        */

        $restaurant->update([
            'approved' => true,
            'is_active' => true,
            'rejection_reason' => null,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Activate staff account
        |--------------------------------------------------------------------------
        */

        $owner->update([
            'is_active' => true,
            'restaurant_id' => $restaurant->id,
        ]);

        $restaurant->load('owner');

        return response()->json([
            'success' => true,
            'message' =>
                'Restaurant and staff account approved successfully.',
            'data' => [
                'restaurant' => $restaurant,
                'staff' => $owner->fresh(),
            ],
        ]);
    });
}

/**
 * Reject restaurant application.
 */
public function rejectRestaurant(
    Request $request,
    Restaurant $restaurant
): JsonResponse {
    $validated = $request->validate([
        'rejection_reason' => [
            'required',
            'string',
            'max:2000',
        ],
    ]);

    return DB::transaction(function () use (
        $restaurant,
        $validated
    ) {

        $restaurant->update([
            'approved' => false,
            'is_active' => false,
            'rejection_reason' =>
                $validated['rejection_reason'],
        ]);

        if ($restaurant->owner) {
            $restaurant->owner->update([
                'is_active' => false,
            ]);
        }

        $restaurant->load('owner');

        return response()->json([
            'success' => true,
            'message' =>
                'Restaurant application rejected successfully.',
            'data' => [
                'restaurant' => $restaurant,
                'staff' => $restaurant->owner,
            ],
        ]);
    });
}

/**
 * Request changes from restaurant applicant.
 */
public function requestRestaurantChanges(
    Request $request,
    Restaurant $restaurant
): JsonResponse {
    $validated = $request->validate([
        'rejection_reason' => [
            'required',
            'string',
            'max:2000',
        ],
    ]);

    return DB::transaction(function () use (
        $restaurant,
        $validated
    ) {

        $restaurant->update([
            'approved' => false,
            'is_active' => false,
            'rejection_reason' =>
                $validated['rejection_reason'],
        ]);

        if ($restaurant->owner) {
            $restaurant->owner->update([
                'is_active' => false,
            ]);
        }

        $restaurant->load('owner');

        return response()->json([
            'success' => true,
            'message' =>
                'Changes have been requested from the restaurant applicant.',
            'data' => [
                'restaurant' => $restaurant,
                'staff' => $restaurant->owner,
            ],
        ]);
    });
}

   
    public function notifications(): JsonResponse
    {
        $pendingRestaurants = Restaurant::where('approved', false)
            ->where('is_active', true)
            ->count();

        $pendingReservations = Reservation::where(
            'status',
            'pending'
        )->count();

        $suspendedUsers = User::where(
            'is_active',
            false
        )->count();

        return response()->json([
            'success' => true,
            'message' => 'Admin notifications retrieved successfully.',
            'data' => [
                'items' => [
                    [
                        'type' => 'restaurant_approval',
                        'count' => $pendingRestaurants,
                        'message' => 'Restaurants waiting for approval.',
                    ],
                    [
                        'type' => 'pending_reservation',
                        'count' => $pendingReservations,
                        'message' => 'Reservations awaiting action.',
                    ],
                    [
                        'type' => 'suspended_user',
                        'count' => $suspendedUsers,
                        'message' => 'Suspended user accounts.',
                    ],
                ],
                'total' =>
                    $pendingRestaurants +
                    $pendingReservations +
                    $suspendedUsers,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SETTINGS
    |--------------------------------------------------------------------------
    */

    /**
     * Platform settings.
     *
     * There is currently no settings table in the supplied schema,
     * so this endpoint returns safe platform configuration metadata
     * rather than inventing persistent settings.
     */
    public function settings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Platform settings retrieved successfully.',
            'data' => [
                'application' => [
                    'name' => config('app.name'),
                    'environment' => config('app.env'),
                    'debug' => (bool) config('app.debug'),
                    'timezone' => config('app.timezone'),
                ],

                'authentication' => [
                    'guard' => 'api',
                    'driver' => 'jwt',
                ],

                'roles' => [
                    'admin',
                    'staff',
                    'diner',
                ],
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Determine the report date range.
     *
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
    private function reportDateRange(string $range): array
    {
        $endDate = Carbon::today();

        return match ($range) {
            '7d' => [
                Carbon::today()->subDays(6),
                $endDate,
            ],

            '30d' => [
                Carbon::today()->subDays(29),
                $endDate,
            ],

            '90d' => [
                Carbon::today()->subDays(89),
                $endDate,
            ],

            '1y' => [
                Carbon::today()->subYear()->addDay(),
                $endDate,
            ],

            'all' => [
                null,
                null,
            ],

            default => [
                Carbon::today()->subDays(29),
                $endDate,
            ],
        };
    }

    /**
     * Build daily reservation report.
     */
    private function dailyReservationReport(
        ?Carbon $startDate,
        ?Carbon $endDate
    ): array {
        if (!$startDate || !$endDate) {
            $startDate = Reservation::min('reservation_date');

            if (!$startDate) {
                return [];
            }

            $startDate = Carbon::parse($startDate);
            $endDate = Carbon::today();
        }

        $rows = Reservation::query()
            ->select([
                'reservation_date',
                DB::raw('COUNT(*) as reservations'),
                DB::raw('SUM(party_size) as covers'),
            ])
            ->whereDate(
                'reservation_date',
                '>=',
                $startDate
            )
            ->whereDate(
                'reservation_date',
                '<=',
                $endDate
            )
            ->groupBy('reservation_date')
            ->orderBy('reservation_date')
            ->get();

        return $rows->map(function ($row) {
            return [
                'date' => Carbon::parse(
                    $row->reservation_date
                )->toDateString(),

                'reservations' => (int) $row->reservations,

                'covers' => (int) $row->covers,
            ];
        })->values()->all();
    }

    /**
     * Build top restaurant report.
     */
    private function topRestaurantReport(
        ?Carbon $startDate,
        ?Carbon $endDate
    ): array {
        $restaurants = Restaurant::query()
            ->withCount([
                'reservations as reservations_count' => function ($query) use ($startDate, $endDate) {
                    if ($startDate && $endDate) {
                        $query
                            ->whereDate(
                                'reservation_date',
                                '>=',
                                $startDate
                            )
                            ->whereDate(
                                'reservation_date',
                                '<=',
                                $endDate
                            );
                    }
                },
            ])
            ->orderByDesc('reservations_count')
            ->limit(10)
            ->get([
                'id',
                'name',
                'city',
                'state',
            ]);

        return $restaurants->map(function ($restaurant) {
            return [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'city' => $restaurant->city,
                'state' => $restaurant->state,
                'reservations' => (int) $restaurant->reservations_count,
            ];
        })->values()->all();
    }
}