<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuItemResource;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MenuItemController extends Controller
{
    use ApiResponse;

    public function index(Restaurant $restaurant): JsonResponse
    {
        $menuItems = $restaurant->menuItems()
            ->orderBy('category')
            ->get();

        return $this->successResponse(
            MenuItemResource::collection($menuItems)
        );
    }

    public function store(
        Request $request,
        Restaurant $restaurant
    ): JsonResponse {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0|max:999999.99',
            'category' => 'required|string|max:100',
            'image' => 'nullable|string|max:255',
            'is_available' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $menuItem = $restaurant->menuItems()->create(
            $validator->validated()
        );

        return $this->successResponse(
            new MenuItemResource($menuItem),
            'Menu item created',
            201
        );
    }

    public function update(
        Request $request,
        MenuItem $menuItem
    ): JsonResponse {
        $user = auth()->user();

        // Admins can modify any restaurant's menu item.
        if ($user->isAdmin()) {
            // Continue.
        } elseif (
            !$user->isStaff() ||
            !$user->restaurant_id ||
            (int) $menuItem->restaurant_id !== (int) $user->restaurant_id
        ) {
            return $this->errorResponse(
                'You do not have access to this menu item.',
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0|max:999999.99',
            'category' => 'sometimes|string|max:100',
            'image' => 'nullable|string|max:255',
            'is_available' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $menuItem->update($validator->validated());

        return $this->successResponse(
            new MenuItemResource($menuItem->fresh()),
            'Menu item updated'
        );
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $user = auth()->user();

        // Admins can delete any restaurant's menu item.
        if ($user->isAdmin()) {
            // Continue.
        } elseif (
            !$user->isStaff() ||
            !$user->restaurant_id ||
            (int) $menuItem->restaurant_id !== (int) $user->restaurant_id
        ) {
            return $this->errorResponse(
                'You do not have access to this menu item.',
                403
            );
        }

        $menuItem->delete();

        return $this->successResponse(
            null,
            'Menu item deleted'
        );
    }
}