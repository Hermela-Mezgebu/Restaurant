<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(Restaurant $restaurant): JsonResponse
    {
        $reviews = $restaurant->reviews()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(request()->per_page ?? 15);

        return $this->successResponse(ReviewResource::collection($reviews));
    }

    public function store(Request $request, Restaurant $restaurant): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first(), 422);
        }

        $hasDined = Reservation::where('user_id', auth()->id())
            ->where('restaurant_id', $restaurant->id)
            ->whereIn('status', ['completed', 'seated'])
            ->exists();

        if (!$hasDined) {
            return $this->errorResponse('You must have dined at this restaurant before reviewing.', 403);
        }

        $existing = Review::where('user_id', auth()->id())
            ->where('restaurant_id', $restaurant->id)
            ->first();

        if ($existing) {
            return $this->errorResponse('You have already reviewed this restaurant.', 422);
        }

        $review = Review::create([
            'user_id' => auth()->id(),
            'restaurant_id' => $restaurant->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        $review->load('user');

        return $this->successResponse(new ReviewResource($review), 'Review created', 201);
    }

    public function destroy(Review $review): JsonResponse
    {
        if ($review->user_id !== auth()->id()) {
            return $this->errorResponse('Forbidden.', 403);
        }

        $review->delete();

        return $this->successResponse(null, 'Review deleted');
    }
}
