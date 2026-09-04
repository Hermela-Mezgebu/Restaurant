<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReservationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $reservations = auth()->user()
            ->reservations()
            ->with(['restaurant', 'table'])
            ->orderBy('reservation_date', 'desc')
            ->paginate($request->per_page ?? 15);

        return $this->successResponse(ReservationResource::collection($reservations));
    }

public function store(StoreReservationRequest $request): JsonResponse
{
    $data = $request->validated();

    $data['user_id'] = auth()->id();
    $data['status'] = 'pending';

    return DB::transaction(function () use ($data) {
        $table = RestaurantTable::where('id', $data['table_id'])
            ->where('restaurant_id', $data['restaurant_id'])
            ->where('status', 'available')
            ->lockForUpdate()
            ->first();

        if (!$table) {
            return $this->errorResponse(
                'Selected table is not available.',
                422
            );
        }

        // Make sure the table can accommodate the party.
        if ($table->capacity < $data['party_size']) {
            return $this->errorResponse(
                'Table capacity is too small for the party size.',
                422
            );
        }

        // Check for an existing active reservation
        // for this exact table/date/time.
        $conflicting = Reservation::where('table_id', $data['table_id'])
            ->where('reservation_date', $data['reservation_date'])
            ->where('reservation_time', $data['reservation_time'])
            ->whereIn('status', [
                'pending',
                'confirmed',
                'seated',
            ])
            ->whereNull('deleted_at')
            ->exists();

        if ($conflicting) {
            return $this->errorResponse(
                'Table is already reserved for this date and time.',
                409
            );
        }

        $reservation = Reservation::create($data);

        $reservation->load([
            'user',
            'table',
            'restaurant',
        ]);

        return $this->successResponse(
            new ReservationResource($reservation),
            'Reservation created',
            201
        );
    });
}

    public function show(Reservation $reservation): JsonResponse
    {
        if ($reservation->user_id !== auth()->id() && !auth()->user()->isStaff() && !auth()->user()->isAdmin()) {
            return $this->errorResponse('Forbidden.', 403);
        }

        $reservation->load(['user', 'table', 'restaurant']);

        return $this->successResponse(new ReservationResource($reservation));
    }

public function update(Request $request, Reservation $reservation): JsonResponse
{
    if ($reservation->user_id !== auth()->id()) {
        return $this->errorResponse('Forbidden.', 403);
    }

    if (!in_array($reservation->status, ['pending', 'confirmed'])) {
        return $this->errorResponse(
            'Cannot modify a reservation that is already ' . $reservation->status . '.',
            422
        );
    }

    $validator = Validator::make($request->all(), [
        'party_size' => 'sometimes|integer|min:1|max:50',
        'reservation_date' => 'sometimes|date|after_or_equal:today',
        'reservation_time' => 'sometimes|date_format:H:i',
        'notes' => 'nullable|string|max:500',
        'special_requests' => 'nullable|string|max:500',
    ]);

    if ($validator->fails()) {
        return $this->errorResponse(
            $validator->errors()->first(),
            422
        );
    }

    $updates = $validator->validated();

    return DB::transaction(function () use ($reservation, $updates) {

        // Lock the table so another transaction cannot
        // modify reservations for it simultaneously.
        $table = RestaurantTable::where('id', $reservation->table_id)
            ->lockForUpdate()
            ->first();

        if (!$table) {
            return $this->errorResponse(
                'Reservation table no longer exists.',
                422
            );
        }

        $newPartySize = $updates['party_size']
            ?? $reservation->party_size;

        $newDate = $updates['reservation_date']
            ?? $reservation->reservation_date;

        $newTime = $updates['reservation_time']
            ?? $reservation->reservation_time;

        if ($table->capacity < $newPartySize) {
            return $this->errorResponse(
                'Table capacity is too small for the party size.',
                422
            );
        }

        $conflicting = Reservation::where('table_id', $reservation->table_id)
            ->where('reservation_date', $newDate)
            ->where('reservation_time', $newTime)
            ->whereIn('status', [
                'pending',
                'confirmed',
                'seated',
            ])
            ->whereNull('deleted_at')
            ->where('id', '!=', $reservation->id)
            ->exists();

        if ($conflicting) {
            return $this->errorResponse(
                'Table is already reserved for this date and time.',
                409
            );
        }

        $reservation->update($updates);

        $reservation->load([
            'user',
            'table',
            'restaurant',
        ]);

        return $this->successResponse(
            new ReservationResource($reservation),
            'Reservation updated'
        );
    });
}

    public function destroy(Reservation $reservation): JsonResponse
    {
        if ($reservation->user_id !== auth()->id()) {
            return $this->errorResponse('Forbidden.', 403);
        }

        $reservation->update(['status' => 'cancelled']);
        $reservation->delete();

        return $this->successResponse(null, 'Reservation cancelled');
    }

    public function restaurantReservations(Restaurant $restaurant): JsonResponse
    {
        $reservations = Reservation::where('restaurant_id', $restaurant->id)
            ->with(['user', 'table'])
            ->orderBy('reservation_date', 'desc')
            ->orderBy('reservation_time', 'desc')
            ->paginate(request()->per_page ?? 15);

        return $this->successResponse(ReservationResource::collection($reservations));
    }

    public function updateStatus(Request $request, Reservation $reservation): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,confirmed,seated,completed,cancelled,declined',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first(), 422);
        }

        $reservation->update(['status' => $request->status]);

        return $this->successResponse(new ReservationResource($reservation), 'Reservation status updated');
    }

    public function availability(Request $request, Restaurant $restaurant): JsonResponse
{
    $validator = Validator::make($request->all(), [
        'date' => 'required|date|after_or_equal:today',
        'time' => 'required|date_format:H:i',
        'party_size' => 'required|integer|min:1|max:50',
    ]);

    if ($validator->fails()) {
        return $this->errorResponse(
            $validator->errors()->first(),
            422
        );
    }

    $date = $request->date;
    $time = $request->time;
    $partySize = (int) $request->party_size;

    $reservedTableIds = Reservation::where('restaurant_id', $restaurant->id)
        ->where('reservation_date', $date)
        ->where('reservation_time', $time)
        ->whereIn('status', ['pending', 'confirmed', 'seated'])
        ->whereNull('deleted_at')
        ->pluck('table_id');

    $tables = RestaurantTable::where('restaurant_id', $restaurant->id)
        ->where('status', 'available')
        ->where('capacity', '>=', $partySize)
        ->whereNotIn('id', $reservedTableIds)
        ->orderBy('capacity')
        ->orderBy('table_number')
        ->get();

    return $this->successResponse([
        'restaurant_id' => $restaurant->id,
        'date' => $date,
        'time' => $time,
        'party_size' => $partySize,
        'available_tables' => $tables,
        'available_count' => $tables->count(),
    ]);
}
}
