
<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\TableController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\StaffMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {

    // Public authentication routes
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

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
| Public Restaurant Routes
|--------------------------------------------------------------------------
*/

Route::get('restaurants', [
    RestaurantController::class,
    'index'
]);

Route::get('restaurants/{restaurant}/availability', [
    RestaurantController::class,
    'availability'
]);

Route::get('restaurants/{restaurant}', [
    RestaurantController::class,
    'show'
]);


/*
|--------------------------------------------------------------------------
| Protected Restaurant Routes
|--------------------------------------------------------------------------
|
| The application uses JWT authentication through the "api" guard.
| Therefore these routes use auth:api, not auth:sanctum.
|
*/

Route::middleware('auth:api')->group(function () {

    Route::post('restaurants', [
        RestaurantController::class,
        'store'
    ]);

    Route::put('restaurants/{restaurant}', [
        RestaurantController::class,
        'update'
    ]);

    Route::delete('restaurants/{restaurant}', [
        RestaurantController::class,
        'destroy'
    ]);
});


/*
|--------------------------------------------------------------------------
| Table Routes
|--------------------------------------------------------------------------
|
| Staff and admin only.
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
| All reservation routes use the JWT "api" guard.
|
*/

Route::middleware('auth:api')->group(function () {

    // List current user's reservations
    Route::get(
        'reservations',
        [ReservationController::class, 'index']
    );

    // Create reservation
    Route::post(
        'reservations',
        [ReservationController::class, 'store']
    );

    // View reservation
    Route::get(
        'reservations/{reservation}',
        [ReservationController::class, 'show']
    );

    // Update reservation
    Route::put(
        'reservations/{reservation}',
        [ReservationController::class, 'update']
    );

    // Cancel reservation
    Route::delete(
        'reservations/{reservation}',
        [ReservationController::class, 'destroy']
    );
});


/*
|--------------------------------------------------------------------------
| Restaurant Reservation Management
|--------------------------------------------------------------------------
|
| Staff and admin can view reservations for their restaurant.
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

// Staff/admin menu management
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
*/

Route::middleware([
    'auth:api',
    AdminMiddleware::class,
])->prefix('admin')->group(function () {

    Route::get(
        'restaurants',
        [AdminController::class, 'restaurants']
    );

    Route::get(
        'users',
        [AdminController::class, 'users']
    );

    Route::put(
        'restaurants/{restaurant}/approve',
        [AdminController::class, 'approve']
    );

    Route::put(
        'users/{user}/suspend',
        [AdminController::class, 'suspend']
    );

    Route::get(
        'analytics',
        [AdminController::class, 'analytics']
    );
});
