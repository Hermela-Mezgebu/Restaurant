<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\TableController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Controllers\Admin\ApprovalController;
use App\Http\Middleware\StaffMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {

    // Public authentication routes
   Route::post('/register', [
        AuthController::class,
        'register'
    ]);

    Route::post('/login', [
        AuthController::class,
        'login'
    ]);

    // Authenticated user routes
    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('me', [AuthController::class, 'updateProfile']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});


/*
|--------------------------------------------------------------------------
| Restaurant Routes
|--------------------------------------------------------------------------
*/

// Public restaurant routes
Route::get(
    'restaurants',
    [RestaurantController::class, 'index']
);

Route::get(
    'restaurants/{restaurant}/availability',
    [RestaurantController::class, 'availability']
);

Route::get(
    'restaurants/{restaurant}',
    [RestaurantController::class, 'show']
);


// Authenticated restaurant routes
Route::middleware('auth:api')->group(function () {

    Route::post(
        'restaurants',
        [RestaurantController::class, 'store']
    );

    Route::put(
        'restaurants/{restaurant}',
        [RestaurantController::class, 'update']
    );

    Route::delete(
        'restaurants/{restaurant}',
        [RestaurantController::class, 'destroy']
    )->middleware(AdminMiddleware::class);
});


/*
|--------------------------------------------------------------------------
| Table Routes
|--------------------------------------------------------------------------
|
| Staff/Admin
|
*/

Route::middleware([
    'auth:api',
    StaffMiddleware::class,
])->group(function () {

    Route::get(
        'restaurants/{restaurant}/tables',
        [TableController::class, 'index']
    );

    Route::post(
        'restaurants/{restaurant}/tables',
        [TableController::class, 'store']
    );

    Route::put(
        'restaurants/{restaurant}/tables/{table}',
        [TableController::class, 'update']
    );

    Route::delete(
        'restaurants/{restaurant}/tables/{table}',
        [TableController::class, 'destroy']
    );
});


/*
|--------------------------------------------------------------------------
| Reservation Routes
|--------------------------------------------------------------------------
|
| Authenticated users
|
*/

Route::middleware('auth:api')->group(function () {

    Route::get(
        'reservations',
        [ReservationController::class, 'index']
    );

    Route::post(
        'reservations',
        [ReservationController::class, 'store']
    );

    Route::get(
        'reservations/{reservation}',
        [ReservationController::class, 'show']
    );

    Route::put(
        'reservations/{reservation}',
        [ReservationController::class, 'update']
    );

    Route::delete(
        'reservations/{reservation}',
        [ReservationController::class, 'destroy']
    );
});


/*
|--------------------------------------------------------------------------
| Restaurant Reservations
|--------------------------------------------------------------------------
|
| Staff/Admin
|
*/

Route::middleware([
    'auth:api',
    StaffMiddleware::class,
])->group(function () {

    Route::get(
        'restaurants/{restaurant}/reservations',
        [ReservationController::class, 'restaurantReservations']
    );

    Route::put(
        'reservations/{reservation}/status',
        [ReservationController::class, 'updateStatus']
    );
});


/*
|--------------------------------------------------------------------------
| Review Routes
|--------------------------------------------------------------------------
*/

// Public reviews
Route::get(
    'restaurants/{restaurant}/reviews',
    [ReviewController::class, 'index']
);


// Authenticated review actions
Route::middleware('auth:api')->group(function () {

    Route::post(
        'restaurants/{restaurant}/reviews',
        [ReviewController::class, 'store']
    );

    Route::delete(
        'reviews/{review}',
        [ReviewController::class, 'destroy']
    );
});


/*
|--------------------------------------------------------------------------
| Menu Routes
|--------------------------------------------------------------------------
*/

// Public menu
Route::get(
    'restaurants/{restaurant}/menu',
    [MenuItemController::class, 'index']
);


// Staff/Admin menu management
Route::middleware([
    'auth:api',
    StaffMiddleware::class,
])->group(function () {

    Route::post(
        'restaurants/{restaurant}/menu',
        [MenuItemController::class, 'store']
    );

    Route::put(
        'menu-items/{menuItem}',
        [MenuItemController::class, 'update']
    );

    Route::delete(
        'menu-items/{menuItem}',
        [MenuItemController::class, 'destroy']
    );
});


/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
|
| Everything in this group becomes:
|
| /api/admin/...
|
| Do NOT add another "admin/" prefix inside this group.
|
*/

Route::middleware([
    'auth:api',
    AdminMiddleware::class,
])->prefix('admin')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Admin Dashboard / Overview
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/',
        [AdminController::class, 'analytics']
    );

    Route::get(
        'analytics',
        [AdminController::class, 'analytics']
    );


    /*
    |--------------------------------------------------------------------------
    | Restaurants
    |--------------------------------------------------------------------------
    */

    Route::get(
        'restaurants',
        [AdminController::class, 'restaurants']
    );

    Route::get(
        'restaurants/pending',
        [AdminController::class, 'pending']
    );

    Route::put(
        'restaurants/{restaurant}/approve',
        [AdminController::class, 'approve']
    );

    Route::patch(
        'restaurants/{restaurant}/approve',
        [AdminController::class, 'approve']
    );

    Route::patch(
        'restaurants/{restaurant}/reject',
        [AdminController::class, 'reject']
    );

    Route::patch(
        'restaurants/{restaurant}/request-changes',
        [AdminController::class, 'requestChanges']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Users
    |--------------------------------------------------------------------------
    */

    Route::get(
        'users',
        [AdminController::class, 'users']
    );

    Route::put(
        'users/{user}/suspend',
        [AdminController::class, 'suspend']
    );


    /*
    |--------------------------------------------------------------------------
    | Create Another Admin
    |--------------------------------------------------------------------------
    */

    Route::post(
        'admins',
        [AdminController::class, 'storeAdmin']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Tables
    |--------------------------------------------------------------------------
    |
    | These use the existing restaurant table system but expose an
    | admin-level entry point for the Admin Tables page.
    |
    */

    Route::get(
        'tables',
        [TableController::class, 'adminIndex']
    );

    Route::get(
        'tables/{table}',
        [TableController::class, 'adminShow']
    );

    Route::put(
        'tables/{table}',
        [TableController::class, 'adminUpdate']
    );

    Route::delete(
        'tables/{table}',
        [TableController::class, 'adminDestroy']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Reservations
    |--------------------------------------------------------------------------
    |
    | Keep the existing restaurant-level reservation API.
    | These routes provide the admin page with a global entry point.
    |
    */

    Route::get(
        'reservations',
        [ReservationController::class, 'adminIndex']
    );

    Route::get(
        'reservations/{reservation}',
        [ReservationController::class, 'adminShow']
    );

    Route::put(
        'reservations/{reservation}/status',
        [ReservationController::class, 'adminUpdateStatus']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Staff
    |--------------------------------------------------------------------------
    */

    Route::get(
        'staff',
        [AdminController::class, 'staff']
    );

    Route::get(
        'staff/{user}',
        [AdminController::class, 'staffShow']
    );

    Route::put(
        'staff/{user}',
        [AdminController::class, 'updateStaff']
    );

    Route::delete(
        'staff/{user}',
        [AdminController::class, 'deleteStaff']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Notifications
    |--------------------------------------------------------------------------
    */

    Route::get(
        'notifications',
        [AdminController::class, 'notifications']
    );

    Route::post(
        'notifications',
        [AdminController::class, 'storeNotification']
    );

    Route::put(
        'notifications/{notification}/read',
        [AdminController::class, 'markNotificationRead']
    );

    Route::delete(
        'notifications/{notification}',
        [AdminController::class, 'deleteNotification']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Reports
    |--------------------------------------------------------------------------
    */

    Route::get(
        'reports',
        [AdminController::class, 'reports']
    );

    Route::get(
        'reports/overview',
        [AdminController::class, 'reportOverview']
    );

    Route::get(
        'reports/restaurants',
        [AdminController::class, 'restaurantReports']
    );

    Route::get(
        'reports/reservations',
        [AdminController::class, 'reservationReports']
    );

    Route::get(
        'reports/users',
        [AdminController::class, 'userReports']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Settings
    |--------------------------------------------------------------------------
    */

    Route::get(
        'settings',
        [AdminController::class, 'settings']
    );

    Route::put(
        'settings',
        [AdminController::class, 'updateSettings']
    );


    /*
    |--------------------------------------------------------------------------
    | Admin Approvals
    |--------------------------------------------------------------------------
    |
    | Approval dashboard endpoints.
    |
    */
Route::get(
    'approvals',
    [ApprovalController::class, 'approvals']
);

Route::get(
    'approvals/pending',
    [ApprovalController::class, 'pendingApprovals']
);

Route::post(
    'approvals/restaurants/{restaurant}/approve',
    [ApprovalController::class, 'approveRestaurant']
);

Route::post(
    'approvals/restaurants/{restaurant}/reject',
    [ApprovalController::class, 'rejectRestaurant']
);

Route::post(
    'approvals/restaurants/{restaurant}/request-changes',
    [ApprovalController::class, 'requestRestaurantChanges']
);

});