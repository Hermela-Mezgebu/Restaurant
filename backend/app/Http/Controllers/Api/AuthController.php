<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Register a new diner.
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'diner',
            'phone' => $request->phone,
        ]);

        /*
         * Generate JWT token for the newly registered user.
         */
        $token = auth('api')->login($user);

        if (!is_string($token) || empty($token)) {
            return $this->errorResponse(
                'Unable to generate authentication token.',
                500
            );
        }

        return $this->successResponse(
            [
                'user' => new UserResource($user),
                'access_token' => $token,
                'token_type' => 'bearer',
            ],
            'User registered successfully',
            201
        );
    }

    /**
     * Login existing user.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $credentials = [
            'email' => $request->email,
            'password' => $request->password,
        ];

        /*
         * IMPORTANT:
         * Use the API guard explicitly.
         */
        $token = auth('api')->attempt($credentials);

        /*
         * attempt() should return false when credentials
         * are invalid.
         */
        if (!$token) {
            return $this->errorResponse(
                'Invalid credentials',
                401
            );
        }

        /*
         * JWT-auth should return a STRING token.
         * If it returns boolean true, something is wrong
         * with the JWT configuration/package.
         */
        if (!is_string($token) || empty($token)) {
            return $this->errorResponse(
                'Authentication succeeded, but the JWT token could not be generated correctly.',
                500
            );
        }

        $user = auth('api')->user();

        return $this->successResponse(
            [
                'user' => new UserResource($user),
                'access_token' => $token,
                'token_type' => 'bearer',
            ],
            'Login successful'
        );
    }

    /**
     * Get currently authenticated user.
     */
    public function me(): JsonResponse
    {
        $user = auth('api')->user();

        return $this->successResponse(
            new UserResource($user)
        );
    }

    /**
     * Update authenticated user's profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'password' => 'sometimes|string|min:6|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        if ($request->has('email')) {
            $user->email = $request->email;
        }

        if ($request->has('phone')) {
            $user->phone = $request->phone;
        }

        if ($request->has('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return $this->successResponse(
            new UserResource($user),
            'Profile updated'
        );
    }

    /**
     * Logout authenticated user.
     */
    public function logout(): JsonResponse
    {
        auth('api')->logout();

        return $this->successResponse(
            null,
            'Logged out successfully'
        );
    }

    /**
     * Refresh JWT token.
     */
    public function refresh(): JsonResponse
    {
        $token = auth('api')->refresh();

        if (!is_string($token) || empty($token)) {
            return $this->errorResponse(
                'Unable to refresh authentication token.',
                500
            );
        }

        return $this->successResponse(
            [
                'access_token' => $token,
                'token_type' => 'bearer',
            ],
            'Token refreshed'
        );
    }
}