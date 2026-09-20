<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Register a new diner or restaurant staff member.
     *
     * Diner:
     * - Account is immediately active.
     * - No restaurant is attached.
 *
     * Staff:
     * - Creates their own restaurant during registration.
     * - Restaurant starts pending.
     * - Staff account starts inactive.
     * - Admin must approve the restaurant.
     * - Once approved, the staff account becomes active.
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
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
                'confirmed',
            ],

            'role' => [
                'required',
                'in:diner,staff',
            ],

            /*
            |--------------------------------------------------------------------------
            | Restaurant
            |--------------------------------------------------------------------------
            */

            'restaurant' => [
                'required_if:role,staff',
                'array',
            ],

            'restaurant.name' => [
                'required_if:role,staff',
                'string',
                'max:255',
            ],

            'restaurant.description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'restaurant.cuisine_type' => [
                'nullable',
                'string',
                'max:255',
            ],

            'restaurant.price_range' => [
                'nullable',
                'string',
                'max:50',
            ],

            'restaurant.phone' => [
                'nullable',
                'string',
                'max:50',
            ],

            'restaurant.email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'restaurant.website' => [
                'nullable',
                'string',
                'max:255',
            ],

            'restaurant.address' => [
                'required_if:role,staff',
                'string',
                'max:500',
            ],

            'restaurant.city' => [
                'required_if:role,staff',
                'string',
                'max:255',
            ],

            'restaurant.area' => [
                'nullable',
                'string',
                'max:255',
            ],

            'restaurant.state' => [
                'nullable',
                'string',
                'max:255',
            ],

            'restaurant.latitude' => [
                'nullable',
                'numeric',
                'between:-90,90',
            ],

            'restaurant.longitude' => [
                'nullable',
                'numeric',
                'between:-180,180',
            ],
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $validated = $validator->validated();

        try {
            $result = DB::transaction(function () use ($validated) {

                $role = $validated['role'];

                /*
                |--------------------------------------------------------------------------
                | DINER REGISTRATION
                |--------------------------------------------------------------------------
                */

                if ($role === 'diner') {

                    $user = User::create([
                        'name' => trim($validated['name']),
                        'email' => strtolower(trim($validated['email'])),
                        'password' => $validated['password'],
                        'role' => 'diner',
                        'restaurant_id' => null,
                        'is_active' => true,
                    ]);

                    return [
                        'user' => $user,
                        'restaurant' => null,
                        'pending_approval' => false,
                    ];
                }

                /*
                |--------------------------------------------------------------------------
                | STAFF REGISTRATION
                |--------------------------------------------------------------------------
                |
                | Staff creates:
                |
                | 1. Their user account
                | 2. Their restaurant
                |
                | Both remain inactive/pending until an admin approves them.
                |
                */

                $user = User::create([
                    'name' => trim($validated['name']),
                    'email' => strtolower(trim($validated['email'])),
                    'password' => $validated['password'],
                    'role' => 'staff',

                    /*
                     * Staff cannot log in until admin approval.
                     */
                    'is_active' => false,

                    'restaurant_id' => null,
                ]);

                $restaurantData = $validated['restaurant'];

                $restaurantName = trim(
                    $restaurantData['name']
                );

                $slug = $this->generateUniqueRestaurantSlug(
                    $restaurantName
                );

                /*
                |--------------------------------------------------------------------------
                | CREATE PENDING RESTAURANT
                |--------------------------------------------------------------------------
                */

                $restaurant = Restaurant::create([
                    'owner_id' => $user->id,

                    'name' => $restaurantName,
                    'slug' => $slug,

                    'description' =>
                        $restaurantData['description'] ?? null,

                    'cuisine_type' =>
                        $restaurantData['cuisine_type'] ?? null,

                    'price_range' =>
                        $restaurantData['price_range'] ?? null,

                    'phone' =>
                        $restaurantData['phone'] ?? null,

                    'email' =>
                        $restaurantData['email'] ?? null,

                    'website' =>
                        $restaurantData['website'] ?? null,

                    'address' =>
                        $restaurantData['address'],

                    'city' =>
                        $restaurantData['city'],

                    'area' =>
                        $restaurantData['area'] ?? null,

                    'state' =>
                        $restaurantData['state'] ?? null,

                    'latitude' =>
                        $restaurantData['latitude'] ?? null,

                    'longitude' =>
                        $restaurantData['longitude'] ?? null,

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT
                    |--------------------------------------------------------------------------
                    |
                    | Restaurant starts pending.
                    |
                    */

                    'approved' => false,
                    'is_active' => false,
                    'rejection_reason' => null,
                ]);

                /*
                |--------------------------------------------------------------------------
                | CONNECT STAFF TO RESTAURANT
                |--------------------------------------------------------------------------
                */

                $user->update([
                    'restaurant_id' => $restaurant->id,
                ]);

                return [
                    'user' => $user->fresh(),
                    'restaurant' => $restaurant->fresh(),
                    'pending_approval' => true,
                ];
            });

            /*
            |--------------------------------------------------------------------------
            | STAFF RESPONSE
            |--------------------------------------------------------------------------
            */

            if ($result['pending_approval']) {
                return $this->successResponse(
                    [
                        'user' => new UserResource(
                            $result['user']
                        ),

                        'restaurant' =>
                            $result['restaurant'],

                        'role' =>
                            $result['user']->role,

                        'pending_approval' => true,
                    ],
                    'Registration submitted successfully. Your restaurant and staff account are waiting for administrator approval.',
                    201
                );
            }

            /*
            |--------------------------------------------------------------------------
            | DINER RESPONSE
            |--------------------------------------------------------------------------
            */

            return $this->successResponse(
                [
                    'user' => new UserResource(
                        $result['user']
                    ),

                    'role' =>
                        $result['user']->role,

                    'pending_approval' => false,
                ],
                'Registration successful.',
                201
            );

        } catch (\Throwable $exception) {

            report($exception);

            return $this->errorResponse(
                'Unable to complete registration. Please try again.',
                500
            );
        }
    }

    /**
     * Generate a unique restaurant slug.
     */
private function generateUniqueRestaurantSlug(string $name): string
{
    $baseSlug = Str::slug($name);

    if ($baseSlug === '') {
        $baseSlug = 'restaurant';
    }

    $slug = $baseSlug;
    $counter = 2;

    while (
        Restaurant::query()
            ->where('slug', $slug)
            ->exists()
    ) {
        $slug = $baseSlug . '-' . $counter;
        $counter++;
    }

    return $slug;
}

    /**
     * Login existing user.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make(
            $request->all(),
            [
                'email' => [
                    'required',
                    'email',
                ],

                'password' => [
                    'required',
                    'string',
                ],
            ]
        );

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $credentials = [
            'email' => strtolower(trim($request->email)),
            'password' => $request->password,
        ];

        /*
        |--------------------------------------------------------------------------
        | JWT LOGIN
        |--------------------------------------------------------------------------
        */

        $token = auth('api')->attempt($credentials);

        /*
        |--------------------------------------------------------------------------
        | INVALID CREDENTIALS
        |--------------------------------------------------------------------------
        */

        if (!$token) {
            return $this->errorResponse(
                'Invalid credentials.',
                401
            );
        }

        /*
        |--------------------------------------------------------------------------
        | TOKEN VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!is_string($token) || empty($token)) {

            auth('api')->logout();

            return $this->errorResponse(
                'Authentication succeeded, but the JWT token could not be generated correctly.',
                500
            );
        }

        /*
        |--------------------------------------------------------------------------
        | GET USER
        |--------------------------------------------------------------------------
        */

        $user = auth('api')->user();

        if (!$user) {

            auth('api')->logout();

            return $this->errorResponse(
                'Unable to retrieve authenticated user.',
                401
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK ACTIVE STATUS
        |--------------------------------------------------------------------------
        |
        | This is important for staff.
        |
        | A staff account created through registration has:
        |
        | is_active = false
        |
        | Therefore they cannot log in until the admin approves them.
        |
        */

        if (!$user->is_active) {

            auth('api')->logout();

            if ($user->isStaff()) {
                return $this->errorResponse(
                    'Your staff account is waiting for administrator approval.',
                    403
                );
            }

            return $this->errorResponse(
                'Your account has been suspended.',
                403
            );
        }

        /*
        |--------------------------------------------------------------------------
        | VALID ROLE
        |--------------------------------------------------------------------------
        */

        if (
            !in_array(
                $user->role,
                [
                    'diner',
                    'staff',
                    'admin',
                ],
                true
            )
        ) {

            auth('api')->logout();

            return $this->errorResponse(
                'Your account has an invalid role.',
                403
            );
        }

        /*
        |--------------------------------------------------------------------------
        | STAFF RESTAURANT VALIDATION
        |--------------------------------------------------------------------------
        |
        | A staff member should have a restaurant.
        |
        */

        if ($user->isStaff()) {

            if (!$user->restaurant_id) {

                auth('api')->logout();

                return $this->errorResponse(
                    'Your staff account is not connected to a restaurant.',
                    403
                );
            }

            $restaurant = Restaurant::query()
                ->where('id', $user->restaurant_id)
                ->where('approved', true)
                ->where('is_active', true)
                ->first();

            if (!$restaurant) {

                auth('api')->logout();

                return $this->errorResponse(
                    'Your restaurant has not been approved yet.',
                    403
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | LOGIN SUCCESS
        |--------------------------------------------------------------------------
        */

        return $this->successResponse(
            [
                'user' => new UserResource($user),

                'role' =>
                    $user->role,

                'access_token' =>
                    $token,

                'token_type' =>
                    'bearer',
            ],
            'Login successful.'
        );
    }

    /**
     * Get currently authenticated user.
     */
    public function me(): JsonResponse
    {
        $user = auth('api')->user();

        if (!$user) {
            return $this->errorResponse(
                'Unauthenticated.',
                401
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Check active account
        |--------------------------------------------------------------------------
        */

        if (!$user->is_active) {

            auth('api')->logout();

            return $this->errorResponse(
                'Your account is inactive.',
                403
            );
        }

        return $this->successResponse(
            new UserResource($user)
        );
    }

    /**
     * Update authenticated user's profile.
     */
    public function updateProfile(
        Request $request
    ): JsonResponse {

        $user = auth('api')->user();

        if (!$user) {
            return $this->errorResponse(
                'Unauthenticated.',
                401
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent suspended users
        |--------------------------------------------------------------------------
        */

        if (!$user->is_active) {

            auth('api')->logout();

            return $this->errorResponse(
                'Your account has been suspended.',
                403
            );
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validator = Validator::make(
            $request->all(),
            [
                'name' => [
                    'sometimes',
                    'string',
                    'max:255',
                ],

                'email' => [
                    'sometimes',
                    'string',
                    'email',
                    'max:255',
                    'unique:users,email,' . $user->id,
                ],

                'phone' => [
                    'nullable',
                    'string',
                    'max:20',
                ],

                'password' => [
                    'sometimes',
                    'string',
                    'min:8',
                    'max:255',
                    'confirmed',
                ],
            ]
        );

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $validated = $validator->validated();

        /*
        |--------------------------------------------------------------------------
        | UPDATE USER
        |--------------------------------------------------------------------------
        */

        if (array_key_exists('name', $validated)) {
            $user->name = trim($validated['name']);
        }

        if (array_key_exists('email', $validated)) {
            $user->email = strtolower(
                trim($validated['email'])
            );
        }

        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
        }

        if (array_key_exists('password', $validated)) {
            $user->password = Hash::make(
                $validated['password']
            );
        }

        $user->save();

        return $this->successResponse(
            new UserResource($user->fresh()),
            'Profile updated successfully.'
        );
    }

    /**
     * Logout authenticated user.
     */
    public function logout(): JsonResponse
    {
        try {
            auth('api')->logout();

            return $this->successResponse(
                null,
                'Logged out successfully.'
            );

        } catch (\Throwable $exception) {

            report($exception);

            return $this->errorResponse(
                'Unable to logout.',
                500
            );
        }
    }

    /**
     * Refresh JWT token.
     */
    public function refresh(): JsonResponse
    {
        try {

            $token = auth('api')->refresh();

            if (
                !is_string($token) ||
                empty($token)
            ) {
                return $this->errorResponse(
                    'Unable to refresh authentication token.',
                    500
                );
            }

            return $this->successResponse(
                [
                    'access_token' =>
                        $token,

                    'token_type' =>
                        'bearer',
                ],
                'Token refreshed.'
            );

        } catch (\Throwable $exception) {

            report($exception);

            return $this->errorResponse(
                'Unable to refresh authentication token.',
                401
            );
        }
    }

    /**
     * Standard success response.
     *
     * This fixes:
     *
     * Call to undefined method
     * App\Http\Controllers\Api\AuthController::successResponse()
     */
    protected function successResponse(
        mixed $data = null,
        string $message = 'Success.',
        int $status = 200
    ): JsonResponse {

        return response()->json(
            [
                'success' => true,
                'message' => $message,
                'data' => $data,
            ],
            $status
        );
    }

    /**
     * Standard error response.
     *
     * This fixes the matching errorResponse()
     * dependency as well.
     */
    protected function errorResponse(
        string $message,
        int $status = 400,
        mixed $errors = null
    ): JsonResponse {

        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json(
            $response,
            $status
        );
    }
}