'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  seating_type: string;
}

interface AvailabilityResponse {
  data?: Table[];
  tables?: Table[];
}

interface ReservationResponse {
  data?: {
    id: number;
  };
  id?: number;
}

export default function ReservationWidget({
  restaurantId,
}: {
  restaurantId: number;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] =
    useState(2);

  const [availableTables, setAvailableTables] =
    useState<Table[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [bookingTableId, setBookingTableId] =
    useState<number | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] =
    useState('');

  const generateTimeSlots = () => {
    const slots: string[] = [];

    for (let hour = 11; hour <= 21; hour++) {
      for (
        let minute = 0;
        minute < 60;
        minute += 30
      ) {
        if (
          hour === 21 &&
          minute > 0
        ) {
          break;
        }

        const displayHour =
          hour > 12
            ? hour - 12
            : hour === 0
              ? 12
              : hour;

        const ampm =
          hour >= 12 ? 'PM' : 'AM';

        const timeString = `${displayHour}:${minute
          .toString()
          .padStart(2, '0')} ${ampm}`;

        slots.push(timeString);
      }
    }

    return slots;
  };

  const today =
    new Date()
      .toISOString()
      .split('T')[0];

  const handleSearch = async () => {
    if (!date || !time) {
      setError(
        'Please select a date and time.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setAvailableTables([]);

    try {
      const response =
        await api.get<AvailabilityResponse>(
          `/restaurants/${restaurantId}/availability`,
          {
            params: {
              date,
              time,
              party_size: partySize,
            },
          }
        );

      const data = response.data;

      const tables =
        data.tables ??
        data.data ??
        [];

      setAvailableTables(tables);

      if (tables.length === 0) {
        setError(
          'No tables are available for this date, time, and party size.'
        );
      }
    } catch (err) {
      console.error(
        'Failed to find available tables:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to find available tables.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (
    tableId: number
  ) => {
    setBookingTableId(tableId);
    setError('');
    setSuccess('');

    try {
      const response =
        await api.post<ReservationResponse>(
          '/reservations',
          {
            restaurant_id: restaurantId,
            table_id: tableId,
            party_size: partySize,
            reservation_date: date,
            reservation_time: time,
          }
        );

      const reservationId =
        response.data.data?.id ??
        response.data.id;

      setSuccess(
        reservationId
          ? `Reservation #${reservationId} booked successfully!`
          : 'Reservation booked successfully!'
      );

      setAvailableTables([]);
    } catch (err) {
      console.error(
        'Booking failed:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Booking failed.'
      );
    } finally {
      setBookingTableId(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">
        Make a Reservation
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Date
          </label>

          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setError('');
              setSuccess('');
              setAvailableTables([]);
            }}
            min={today}
            className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Time
          </label>

          <select
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              setError('');
              setSuccess('');
              setAvailableTables([]);
            }}
            className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">
              Select time
            </option>

            {generateTimeSlots().map(
              (slot) => (
                <option
                  key={slot}
                  value={slot}
                >
                  {slot}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Party Size
          </label>

          <select
            value={partySize}
            onChange={(event) => {
              setPartySize(
                Number(event.target.value)
              );
              setError('');
              setSuccess('');
              setAvailableTables([]);
            }}
            className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Array.from(
              { length: 10 },
              (_, index) => index + 1
            ).map((number) => (
              <option
                key={number}
                value={number}
              >
                {number}{' '}
                {number === 1
                  ? 'Guest'
                  : 'Guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
      >
        {loading
          ? 'Searching...'
          : 'Find a Table'}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 px-4 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}

      {availableTables.length > 0 && (
        <div>
          <h4 className="text-white font-medium mb-3">
            Available Tables
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {availableTables.map(
              (table) => (
                <button
                  key={table.id}
                  onClick={() =>
                    handleBook(table.id)
                  }
                  disabled={
                    bookingTableId ===
                    table.id
                  }
                  className="bg-emerald-900/40 border border-emerald-600/50 rounded-lg p-3 text-center hover:bg-emerald-800/60 transition disabled:opacity-50"
                >
                  <p className="text-white font-semibold">
                    Table{' '}
                    {table.table_number}
                  </p>

                  <p className="text-emerald-300 text-sm">
                    Capacity:{' '}
                    {table.capacity}
                  </p>

                  <p className="text-gray-400 text-xs mt-0.5">
                    {table.seating_type}
                  </p>

                  {bookingTableId ===
                    table.id && (
                    <p className="text-xs text-emerald-300 mt-2">
                      Booking...
                    </p>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}