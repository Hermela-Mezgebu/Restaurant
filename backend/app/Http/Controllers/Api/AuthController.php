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

    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
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
            'is_active' => true,
        ]);

        $token = auth()->login($user);

        return $this->successResponse([
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'bearer',
        ], 'User registered successfully', 201);
    }

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

        /*
        |--------------------------------------------------------------------------
        | Find the user first
        |--------------------------------------------------------------------------
        */

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $this->errorResponse(
                'Invalid credentials',
                401
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Check account status BEFORE creating a JWT
        |--------------------------------------------------------------------------
        */

        if (!$user->is_active) {
            return $this->errorResponse(
                'Your account has been suspended.',
                403
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Verify credentials and create JWT
        |--------------------------------------------------------------------------
        */

        $credentials = [
            'email' => $request->email,
            'password' => $request->password,
        ];

        if (!$token = auth()->attempt($credentials)) {
            return $this->errorResponse(
                'Invalid credentials',
                401
            );
        }

        return $this->successResponse([
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'bearer',
        ], 'Login successful');
    }

    public function me(): JsonResponse
    {
        return $this->successResponse(
            new UserResource(auth()->user())
        );
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        /*
        |--------------------------------------------------------------------------
        | Prevent suspended users from using authenticated endpoints
        |--------------------------------------------------------------------------
        */

        if (!$user->is_active) {
            auth()->logout();

            return $this->errorResponse(
                'Your account has been suspended.',
                403
            );
        }

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

    public function logout(): JsonResponse
    {
        auth()->logout();

        return $this->successResponse(
            null,
            'Logged out successfully'
        );
    }

    public function refresh(): JsonResponse
    {
        $user = auth()->user();

        /*
        |--------------------------------------------------------------------------
        | Prevent suspended users from refreshing their JWT
        |--------------------------------------------------------------------------
        */

        if (!$user->is_active) {
            auth()->logout();

            return $this->errorResponse(
                'Your account has been suspended.',
                403
            );
        }

        $token = auth()->refresh();

        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'bearer',
        ], 'Token refreshed');
    }
}