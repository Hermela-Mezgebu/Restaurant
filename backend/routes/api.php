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

// Auth routes
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('me', [AuthController::class, 'updateProfile']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

// Restaurant routes (public)
Route::get('restaurants', [RestaurantController::class, 'index']);
Route::get('restaurants/{restaurant}', [RestaurantController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Protected Restaurant Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/restaurants', [RestaurantController::class, 'store']);

    Route::put('/restaurants/{restaurant}', [
        RestaurantController::class,
        'update'
    ]);

    Route::delete('/restaurants/{restaurant}', [
        RestaurantController::class,
        'destroy'
    ]);

});

// Table routes (staff/admin)
Route::middleware(['auth:api', StaffMiddleware::class])->group(function () {
    Route::get('restaurants/{restaurant}/tables', [TableController::class, 'index']);
    Route::post('restaurants/{restaurant}/tables', [TableController::class, 'store']);
    Route::put('restaurants/{restaurant}/tables/{table}', [TableController::class, 'update']);
    Route::delete('restaurants/{restaurant}/tables/{table}', [TableController::class, 'destroy']);
});

// Reservation routes (authenticated)
Route::middleware('auth:api')->group(function () {
    Route::get('reservations', [ReservationController::class, 'index']);
    Route::post('reservations', [ReservationController::class, 'store']);
    Route::get('reservations/{reservation}', [ReservationController::class, 'show']);
    Route::put('reservations/{reservation}', [ReservationController::class, 'update']);
    Route::delete('reservations/{reservation}', [ReservationController::class, 'destroy']);
});

// Restaurant reservations (staff)
Route::middleware(['auth:api', StaffMiddleware::class])
    ->get('restaurants/{restaurant}/reservations', [ReservationController::class, 'restaurantReservations']);

// Reservation status (staff)
Route::middleware(['auth:api', StaffMiddleware::class])
    ->put('reservations/{reservation}/status', [ReservationController::class, 'updateStatus']);

// Review routes
Route::get('restaurants/{restaurant}/reviews', [ReviewController::class, 'index']);

Route::middleware('auth:api')->group(function () {
    Route::post('restaurants/{restaurant}/reviews', [ReviewController::class, 'store']);
    Route::delete('reviews/{review}', [ReviewController::class, 'destroy']);
});

// Menu routes
Route::get('restaurants/{restaurant}/menu', [MenuItemController::class, 'index']);

Route::middleware(['auth:api', StaffMiddleware::class])->group(function () {
    Route::post('restaurants/{restaurant}/menu', [MenuItemController::class, 'store']);
    Route::put('menu-items/{menuItem}', [MenuItemController::class, 'update']);
    Route::delete('menu-items/{menuItem}', [MenuItemController::class, 'destroy']);
});

// Admin routes
Route::middleware(['auth:api', AdminMiddleware::class])->prefix('admin')->group(function () {
    Route::get('restaurants', [AdminController::class, 'restaurants']);
    Route::get('users', [AdminController::class, 'users']);
    Route::put('restaurants/{restaurant}/approve', [AdminController::class, 'approve']);
    Route::put('users/{user}/suspend', [AdminController::class, 'suspend']);
    Route::get('analytics', [AdminController::class, 'analytics']);
});
