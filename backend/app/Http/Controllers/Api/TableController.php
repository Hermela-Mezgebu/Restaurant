<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TableController extends Controller
{
    use ApiResponse;

    public function index(Restaurant $restaurant): JsonResponse
    {
        return $this->successResponse($restaurant->tables);
    }

    public function store(Request $request, Restaurant $restaurant): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'table_number' => 'required|integer|min:1|unique:restaurant_tables,table_number,NULL,id,restaurant_id,' . $restaurant->id,
            'capacity' => 'required|integer|min:1|max:50',
            'seating_type' => 'nullable|string|in:standard,outdoor,bar,booth',
            'status' => 'nullable|string|in:available,occupied,reserved',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $table = $restaurant->tables()->create(
            $validator->validated()
        );

        return $this->successResponse(
            $table,
            'Table created',
            201
        );
    }

    public function update(
        Request $request,
        Restaurant $restaurant,
        RestaurantTable $table
    ): JsonResponse {
        // Prevent a table from another restaurant being modified.
        if ((int) $table->restaurant_id !== (int) $restaurant->id) {
            return $this->errorResponse(
                'This table does not belong to the specified restaurant.',
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'table_number' => 'sometimes|integer|min:1|unique:restaurant_tables,table_number,' . $table->id . ',id,restaurant_id,' . $restaurant->id,
            'capacity' => 'sometimes|integer|min:1|max:50',
            'seating_type' => 'sometimes|string|in:standard,outdoor,bar,booth',
            'status' => 'sometimes|string|in:available,occupied,reserved',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $validator->errors()->first(),
                422
            );
        }

        $table->update($validator->validated());

        return $this->successResponse(
            $table->fresh(),
            'Table updated'
        );
    }

    public function destroy(
        Restaurant $restaurant,
        RestaurantTable $table
    ): JsonResponse {
        // Prevent a table from another restaurant being deleted.
        if ((int) $table->restaurant_id !== (int) $restaurant->id) {
            return $this->errorResponse(
                'This table does not belong to the specified restaurant.',
                403
            );
        }

        $table->delete();

        return $this->successResponse(
            null,
            'Table deleted'
        );
    }
}