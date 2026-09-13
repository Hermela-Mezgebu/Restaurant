'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import {
  FiCalendar,
  FiClock,
  FiUsers,
  FiXCircle,
  FiMapPin,
  FiGrid,
  FiHash,
} from 'react-icons/fi';

interface Restaurant {
  id?: number;
  name?: string;
}

interface Table {
  id?: number;
  table_number?: number;
  capacity?: number;
  seating_type?: string;
  status?: string;
}

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'declined';

interface Reservation {
  id: number;
  user_id?: number;
  restaurant_id: number;

  // Backend fields
  reservation_date?: string;
  reservation_time?: string;

  // Frontend fallback fields
  date?: string;
  time?: string;

  party_size: number;

  status: ReservationStatus;

  notes?: string | null;
  special_requests?: string | null;

  restaurant_name?: string;
  restaurant?: Restaurant;

  table_id?: number;
  table?: Table;

  created_at: string;
  updated_at?: string;
}

interface ReservationsResponse {
  success?: boolean;
  message?: string;

  data?:
    | Reservation[]
    | {
        data?: Reservation[];
        current_page?: number;
        total?: number;
      };

  reservations?: Reservation[];
}

const statusStyles: Record<string, string> = {
  pending:
    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',

  confirmed:
    'bg-blue-500/10 text-blue-400 border-blue-500/30',

  seated:
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',

  completed:
    'bg-gray-500/10 text-gray-400 border-gray-500/30',

  cancelled:
    'bg-red-500/10 text-red-400 border-red-500/30',

  declined:
    'bg-red-500/10 text-red-400 border-red-500/30',
};

/**
 * Get the reservation date regardless of whether the
 * backend returns reservation_date or the older date field.
 */
const getReservationDate = (
  reservation: Reservation
): string => {
  return (
    reservation.reservation_date ??
    reservation.date ??
    ''
  );
};

/**
 * Get the reservation time regardless of whether the
 * backend returns reservation_time or the older time field.
 */
const getReservationTime = (
  reservation: Reservation
): string => {
  return (
    reservation.reservation_time ??
    reservation.time ??
    ''
  );
};

/**
 * Get restaurant name from either:
 * restaurant_name
 * or nested restaurant.name
 */
const getRestaurantName = (
  reservation: Reservation
): string => {
  return (
    reservation.restaurant_name ??
    reservation.restaurant?.name ??
    `Restaurant #${reservation.restaurant_id}`
  );
};

/**
 * Get table number from the nested table object first.
 */
const getTableNumber = (
  reservation: Reservation
): number | null => {
  if (
    reservation.table?.table_number !==
      undefined &&
    reservation.table?.table_number !== null
  ) {
    return reservation.table.table_number;
  }

  if (
    reservation.table_id !== undefined &&
    reservation.table_id !== null
  ) {
    return reservation.table_id;
  }

  return null;
};

/**
 * Format YYYY-MM-DD without timezone shifting.
 */
const formatDate = (date?: string): string => {
  if (!date) {
    return 'Date unavailable';
  }

  const parts = date.split('-');

  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isNaN(year) &&
      !Number.isNaN(month) &&
      !Number.isNaN(day)
    ) {
      return new Intl.DateTimeFormat(
        'en-US',
        {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      ).format(
        new Date(
          year,
          month - 1,
          day
        )
      );
    }
  }

  return date;
};

/**
 * Format HH:mm into a user-friendly time.
 */
const formatTime = (time?: string): string => {
  if (!time) {
    return 'Time unavailable';
  }

  const parts = time.split(':');

  if (parts.length >= 2) {
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (
      !Number.isNaN(hour) &&
      !Number.isNaN(minute)
    ) {
      const date = new Date();

      date.setHours(
        hour,
        minute,
        0,
        0
      );

      return new Intl.DateTimeFormat(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      ).format(date);
    }
  }

  return time;
};

/**
 * Convert a reservation's date into a comparable
 * local date/time value.
 *
 * For YYYY-MM-DD dates we deliberately avoid
 * new Date('YYYY-MM-DD') because that can be
 * interpreted as UTC and shift the displayed day.
 */
const getReservationDateTime = (
  reservation: Reservation
): Date | null => {
  const date = getReservationDate(reservation);
  const time = getReservationTime(reservation);

  if (!date) {
    return null;
  }

  const dateParts = date.split('-');

  if (dateParts.length !== 3) {
    return null;
  }

  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return null;
  }

  let hour = 23;
  let minute = 59;

  if (time) {
    const timeParts = time.split(':');

    const parsedHour = Number(
      timeParts[0]
    );

    const parsedMinute = Number(
      timeParts[1] ?? 0
    );

    if (
      !Number.isNaN(parsedHour)
    ) {
      hour = parsedHour;
    }

    if (
      !Number.isNaN(parsedMinute)
    ) {
      minute = parsedMinute;
    }
  }

  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );
};

/**
 * Determine whether a reservation is in the past.
 *
 * Cancelled and declined reservations are treated
 * as past/history reservations regardless of their date.
 */
const isPastReservation = (
  reservation: Reservation
): boolean => {
  if (
    reservation.status ===
      'cancelled' ||
    reservation.status ===
      'declined' ||
    reservation.status ===
      'completed'
  ) {
    return true;
  }

  const reservationDateTime =
    getReservationDateTime(
      reservation
    );

  if (!reservationDateTime) {
    return false;
  }

  return (
    reservationDateTime.getTime() <
    Date.now()
  );
};

export default function ReservationsPage() {
  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [activeTab, setActiveTab] =
    useState<'upcoming' | 'past'>(
      'upcoming'
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [cancellingId, setCancellingId] =
    useState<number | null>(null);

  /**
   * Fetch all reservations once.
   *
   * IMPORTANT:
   *
   * The backend ReservationController@index
   * currently does not filter by ?type=upcoming
   * or ?type=past.
   *
   * Therefore we fetch the user's reservations
   * and perform the Upcoming/Past filtering here.
   */
  useEffect(() => {
    const fetchReservations =
      async () => {
        setLoading(true);
        setError('');

        try {
          const response =
            await api.get<ReservationsResponse>(
              '/reservations'
            );

          const responseData =
            response.data;

          let fetchedReservations: Reservation[] =
            [];

          /**
           * Possible Laravel response:
           *
           * data: [...]
           */
          if (
            Array.isArray(
              responseData.data
            )
          ) {
            fetchedReservations =
              responseData.data;
          }

          /**
           * Possible Laravel paginated response:
           *
           * data: {
           *   data: [...]
           * }
           */
          else if (
            responseData.data &&
            typeof responseData.data ===
              'object' &&
            Array.isArray(
              responseData.data.data
            )
          ) {
            fetchedReservations =
              responseData.data.data;
          }

          /**
           * Fallback:
           *
           * reservations: [...]
           */
          else if (
            Array.isArray(
              responseData.reservations
            )
          ) {
            fetchedReservations =
              responseData.reservations;
          }

          setReservations(
            fetchedReservations
          );
        } catch (err) {
          console.error(
            'Failed to fetch reservations:',
            err
          );

          setError(
            'Failed to load your reservations.'
          );
        } finally {
          setLoading(false);
        }
      };

    fetchReservations();
  }, []);

  /**
   * Filter reservations locally for the
   * active Upcoming/Past tab.
   */
  const visibleReservations =
    useMemo(() => {
      const filtered =
        reservations.filter(
          (reservation) => {
            const past =
              isPastReservation(
                reservation
              );

            return activeTab ===
              'past'
              ? past
              : !past;
          }
        );

      /**
       * Newest/future reservations first.
       */
      return filtered.sort(
        (a, b) => {
          const aDate =
            getReservationDateTime(
              a
            )?.getTime() ?? 0;

          const bDate =
            getReservationDateTime(
              b
            )?.getTime() ?? 0;

          if (
            activeTab ===
            'upcoming'
          ) {
            return aDate - bDate;
          }

          return bDate - aDate;
        }
      );
    }, [
      reservations,
      activeTab,
    ]);

  /**
   * Cancel reservation.
   */
  const handleCancel = async (
    id: number
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to cancel this reservation?'
      );

    if (!confirmed) {
      return;
    }

    setCancellingId(id);
    setError('');

    try {
      await api.delete(
        `/reservations/${id}`
      );

      /**
       * The backend marks the reservation
       * as cancelled and then soft-deletes it.
       *
       * Remove it from the current list so
       * the UI immediately reflects the change.
       */
      setReservations(
        (prev) =>
          prev.filter(
            (reservation) =>
              reservation.id !== id
          )
      );
    } catch (err) {
      console.error(
        'Failed to cancel reservation:',
        err
      );

      setError(
        'Failed to cancel the reservation.'
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            My Reservations
          </h1>

          <p className="text-gray-400 mt-2">
            View and manage your restaurant
            reservations.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(
            [
              'upcoming',
              'past',
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() =>
                setActiveTab(tab)
              }
              className={`px-6 py-2.5 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 border-gray-800" />
          </div>
        ) : visibleReservations.length ===
          0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <FiCalendar className="mx-auto w-12 h-12 text-gray-600 mb-4" />

            <p className="text-gray-300 text-lg font-medium">
              No {activeTab} reservations
            </p>

            <p className="text-gray-600 mt-2 max-w-md mx-auto">
              {activeTab ===
              'upcoming'
                ? 'Browse restaurants and make a reservation to get started.'
                : 'Your completed and cancelled reservations will appear here.'}
            </p>
          </div>
        ) : (
          /* Reservation List */
          <div className="space-y-5">
            {visibleReservations.map(
              (reservation) => {
                const reservationDate =
                  getReservationDate(
                    reservation
                  );

                const reservationTime =
                  getReservationTime(
                    reservation
                  );

                const restaurantName =
                  getRestaurantName(
                    reservation
                  );

                const tableNumber =
                  getTableNumber(
                    reservation
                  );

                const status =
                  reservation.status;

                return (
                  <div
                    key={reservation.id}
                    className="bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 transition overflow-hidden"
                  >
                    {/* Top Section */}
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        {/* Restaurant + Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <h2 className="text-xl font-semibold text-white truncate">
                              {restaurantName}
                            </h2>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                statusStyles[
                                  status
                                ] ||
                                statusStyles.pending
                              }`}
                            >
                              {status
                                .charAt(
                                  0
                                )
                                .toUpperCase() +
                                status.slice(
                                  1
                                )}
                            </span>
                          </div>

                          {/* Reservation Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Date */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                <FiCalendar className="w-5 h-5 text-emerald-400" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Date
                                </p>

                                <p className="text-sm text-gray-200 font-medium">
                                  {formatDate(
                                    reservationDate
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                <FiClock className="w-5 h-5 text-blue-400" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Time
                                </p>

                                <p className="text-sm text-gray-200 font-medium">
                                  {formatTime(
                                    reservationTime
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Guests */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                <FiUsers className="w-5 h-5 text-purple-400" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Guests
                                </p>

                                <p className="text-sm text-gray-200 font-medium">
                                  {
                                    reservation.party_size
                                  }{' '}
                                  {reservation.party_size ===
                                  1
                                    ? 'guest'
                                    : 'guests'}
                                </p>
                              </div>
                            </div>

                            {/* Table */}
                            {tableNumber !==
                              null && (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                  <FiGrid className="w-5 h-5 text-orange-400" />
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">
                                    Table
                                  </p>

                                  <p className="text-sm text-gray-200 font-medium">
                                    Table{' '}
                                    {
                                      tableNumber
                                    }
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Reservation ID */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                <FiHash className="w-5 h-5 text-gray-400" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Reservation
                                </p>

                                <p className="text-sm text-gray-200 font-medium">
                                  #
                                  {
                                    reservation.id
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Restaurant ID */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                                <FiMapPin className="w-5 h-5 text-pink-400" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Restaurant
                                </p>

                                <p className="text-sm text-gray-200 font-medium">
                                  #
                                  {
                                    reservation.restaurant_id
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cancel Button */}
                        {(
                          status ===
                            'pending' ||
                          status ===
                            'confirmed'
                        ) &&
                          activeTab ===
                            'upcoming' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(
                                  reservation.id
                                )
                              }
                              disabled={
                                cancellingId ===
                                reservation.id
                              }
                              className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-4 py-2 rounded-lg border border-red-500/20 hover:bg-red-900/20 transition whitespace-nowrap"
                            >
                              <FiXCircle className="w-4 h-4" />

                              {cancellingId ===
                              reservation.id
                                ? 'Cancelling...'
                                : 'Cancel Reservation'}
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    {(reservation.notes ||
                      reservation.special_requests) && (
                      <div className="border-t border-gray-800 px-6 py-4 bg-gray-950/40">
                        {reservation.notes && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500">
                              Notes
                            </span>

                            <p className="text-sm text-gray-300 mt-1">
                              {
                                reservation.notes
                              }
                            </p>
                          </div>
                        )}

                        {reservation.special_requests && (
                          <div>
                            <span className="text-xs text-gray-500">
                              Special requests
                            </span>

                            <p className="text-sm text-gray-300 mt-1">
                              {
                                reservation.special_requests
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}