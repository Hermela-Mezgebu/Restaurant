'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

interface Restaurant {
  id: number;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  cuisine?: string;
  price_range?: string;
  rating?: number;
  photos?: string[];
  images?: string[];
  image?: string;
}

interface RestaurantTable {
  id: number;
  restaurant_id: number;
  table_number: number | string;
  capacity: number;
  seating_type?: string | null;
  status?: string | null;
}

interface AvailabilityTable extends RestaurantTable {
  available?: boolean;
}

interface RestaurantResponse {
  success?: boolean;
  data: Restaurant;
  message?: string;
}

interface TablesResponse {
  success?: boolean;
  data?: RestaurantTable[];
  tables?: RestaurantTable[];
  message?: string;
}

interface AvailabilityResponse {
  success?: boolean;
  data?: {
    available_tables?: AvailabilityTable[];
    tables?: AvailabilityTable[];
    available?: boolean;
    [key: string]: unknown;
  };
  available_tables?: AvailabilityTable[];
  tables?: AvailabilityTable[];
  message?: string;
}

interface ReservationResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: number;
    restaurant_id: number;
    table_id: number;
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
  };
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) {
    return 'Select date';
  }

  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeForDisplay = (time: string) => {
  if (!time) {
    return 'Select time';
  }

  const [hours, minutes] = time.split(':').map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeTableNumber = (table: RestaurantTable): string => {
  return String(table.table_number).padStart(2, '0');
};

/*
 * IMPORTANT:
 * This function ALWAYS returns a string.
 *
 * Previously:
 *
 * return table.seating_type;
 *
 * could return undefined/null because seating_type is optional.
 */
const getSeatingLabel = (table: RestaurantTable): string => {
  const seating = table.seating_type?.toLowerCase() ?? '';

  if (!seating) {
    return 'Dining';
  }

  if (seating.includes('window')) {
    return 'Window View';
  }

  if (seating.includes('terrace')) {
    return 'Terrace';
  }

  if (seating.includes('garden')) {
    return 'Garden';
  }

  if (seating.includes('booth')) {
    return 'Booth';
  }

  if (seating.includes('mesob')) {
    return 'Mesob';
  }

  if (seating.includes('outdoor')) {
    return 'Outdoor';
  }

  if (seating.includes('bar')) {
    return 'Bar';
  }

  /*
   * The fallback is now guaranteed to be a string.
   */
  return table.seating_type ?? 'Dining';
};

const getTableDescription = (table: RestaurantTable): string => {
  const seating = getSeatingLabel(table);

  switch (seating.toLowerCase()) {
    case 'window view':
      return 'A beautiful window-side placement with a relaxed atmosphere, ideal for conversations and special evenings.';

    case 'terrace':
      return 'An open-air seating area offering a relaxed outdoor dining atmosphere.';

    case 'garden':
      return 'A peaceful garden-side table surrounded by a comfortable outdoor atmosphere.';

    case 'booth':
      return 'A comfortable booth-style setting offering a little more privacy for your dining experience.';

    case 'mesob':
      return 'A warm Ethiopian-inspired seating atmosphere suited to shared meals and memorable occasions.';

    case 'outdoor':
      return 'Enjoy your meal in a relaxed outdoor setting.';

    case 'bar':
      return 'A convenient bar-side seating option for a casual dining experience.';

    default:
      return 'A comfortable dining placement selected especially for your reservation.';
  }
};

const getCapacityLabel = (capacity: number): string => {
  if (capacity <= 2) {
    return '1 - 2 Guests';
  }

  if (capacity <= 4) {
    return `2 - ${capacity} Guests`;
  }

  return `4 - ${capacity} Guests`;
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function BookTablePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const today = new Date().toISOString().split('T')[0];

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const [availableTableIds, setAvailableTableIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [booking, setBooking] = useState(false);

  const [error, setError] = useState('');

  const [bookingError, setBookingError] = useState('');

  const [date, setDate] = useState(
    searchParams.get('date') || today
  );

  const [time, setTime] = useState(
    searchParams.get('time') || '19:00'
  );

  const [partySize, setPartySize] = useState(
    Number(searchParams.get('party_size')) || 2
  );

  const [selectedTableId, setSelectedTableId] =
    useState<number | null>(null);

  const [activeZone, setActiveZone] = useState('all');

  const [occasion, setOccasion] = useState('');

  const [specialRequests, setSpecialRequests] =
    useState('');

  /* ---------------------------------------------------------------------- */
  /* LOAD RESTAURANT                                                        */
  /* ---------------------------------------------------------------------- */

  const loadRestaurant = useCallback(async () => {
    if (!restaurantId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [restaurantResponse, tablesResponse] =
        await Promise.all([
          apiFetch<RestaurantResponse>(
            `/restaurants/${restaurantId}`
          ),

          apiFetch<TablesResponse>(
            `/restaurants/${restaurantId}/tables`
          ),
        ]);

      setRestaurant(restaurantResponse.data);

      const restaurantTables =
        tablesResponse.data ||
        tablesResponse.tables ||
        [];

      setTables(restaurantTables);
    } catch (err) {
      console.error(
        'Failed to load restaurant:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load restaurant information.'
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  /* ---------------------------------------------------------------------- */
  /* LOAD AVAILABILITY                                                      */
  /* ---------------------------------------------------------------------- */

  const loadAvailability = useCallback(async () => {
    if (
      !restaurantId ||
      !date ||
      !time ||
      !partySize
    ) {
      return;
    }

    setAvailabilityLoading(true);
    setBookingError('');

    try {
      const query = new URLSearchParams({
        date,
        time,
        party_size: String(partySize),
      });

      const response =
        await apiFetch<AvailabilityResponse>(
          `/restaurants/${restaurantId}/availability?${query.toString()}`
        );

      /*
       * Laravel may return:
       *
       * {
       *   success: true,
       *   data: {
       *     available_tables: [...]
       *   }
       * }
       *
       * or:
       *
       * {
       *   available_tables: [...]
       * }
       */
      const data =
        response.data || response;

      const availableTables =
        data?.available_tables ||
        data?.tables ||
        [];

      const ids = availableTables
        .map((table) => Number(table.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      setAvailableTableIds(ids);

      /*
       * If the selected table is no longer available,
       * remove the selection.
       */
      if (
        selectedTableId !== null &&
        !ids.includes(selectedTableId)
      ) {
        setSelectedTableId(null);
      }
    } catch (err) {
      console.error(
        'Availability error:',
        err
      );

      setAvailableTableIds([]);

      setSelectedTableId(null);

      setBookingError(
        err instanceof Error
          ? err.message
          : 'Unable to check table availability.'
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, [
    restaurantId,
    date,
    time,
    partySize,
    selectedTableId,
  ]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  /* ---------------------------------------------------------------------- */
  /* FILTER TABLES                                                          */
  /* ---------------------------------------------------------------------- */

  const filteredTables = useMemo(() => {
    if (activeZone === 'all') {
      return tables;
    }

    return tables.filter((table) => {
      const seating =
        table.seating_type?.toLowerCase() ?? '';

      if (activeZone === 'main') {
        return (
          seating === '' ||
          seating.includes('main') ||
          seating.includes('standard') ||
          seating.includes('dining')
        );
      }

      if (activeZone === 'window') {
        return (
          seating.includes('window') ||
          seating.includes('booth')
        );
      }

      if (activeZone === 'terrace') {
        return (
          seating.includes('terrace') ||
          seating.includes('garden') ||
          seating.includes('outdoor')
        );
      }

      if (activeZone === 'mesob') {
        return (
          seating.includes('mesob') ||
          seating.includes('private')
        );
      }

      return seating.includes(activeZone);
    });
  }, [tables, activeZone]);

  /* ---------------------------------------------------------------------- */
  /* SELECTED TABLE                                                         */
  /* ---------------------------------------------------------------------- */

  const selectedTable = useMemo(() => {
    return (
      tables.find(
        (table) =>
          table.id === selectedTableId
      ) || null
    );
  }, [tables, selectedTableId]);

  /* ---------------------------------------------------------------------- */
  /* TABLE STATUS                                                           */
  /* ---------------------------------------------------------------------- */

  const getTableStatus = (
    table: RestaurantTable
  ): 'available' | 'reserved' | 'occupied' => {
    const isAvailable =
      availableTableIds.includes(table.id);

    const rawStatus =
      table.status?.toLowerCase() ?? '';

    /*
     * Backend status takes priority for permanently
     * unavailable/occupied tables.
     */
    if (
      rawStatus === 'occupied' ||
      rawStatus === 'unavailable'
    ) {
      return 'occupied';
    }

    if (rawStatus === 'reserved') {
      /*
       * If availability explicitly says this table is
       * available for the requested date/time, it wins.
       */
      if (isAvailable) {
        return 'available';
      }

      return 'reserved';
    }

    if (isAvailable) {
      return 'available';
    }

    /*
     * The availability endpoint only exposes tables
     * that can be booked for the selected time.
     *
     * Therefore, a table not present in that list is
     * treated as reserved/unavailable for this slot.
     */
    return 'reserved';
  };

  /* ---------------------------------------------------------------------- */
  /* TABLE SELECTABILITY                                                    */
  /* ---------------------------------------------------------------------- */

  const canSelectTable = (
    table: RestaurantTable
  ): boolean => {
    return (
      getTableStatus(table) === 'available' &&
      table.capacity >= partySize
    );
  };

  /* ---------------------------------------------------------------------- */
  /* SELECT TABLE                                                           */
  /* ---------------------------------------------------------------------- */

  const selectTable = (
    table: RestaurantTable
  ) => {
    if (!canSelectTable(table)) {
      return;
    }

    setSelectedTableId(table.id);
    setBookingError('');
  };

  /* ---------------------------------------------------------------------- */
  /* UPDATE URL                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    const query = new URLSearchParams();

    query.set('date', date);
    query.set('time', time);
    query.set(
      'party_size',
      String(partySize)
    );

    window.history.replaceState(
      null,
      '',
      `/restaurants/${restaurantId}/book?${query.toString()}`
    );
  }, [
    restaurantId,
    date,
    time,
    partySize,
  ]);

  /* ---------------------------------------------------------------------- */
  /* CREATE RESERVATION                                                     */
  /* ---------------------------------------------------------------------- */

  const continueReservation = async () => {
    setBookingError('');

    if (!selectedTable) {
      setBookingError(
        'Please select an available table before continuing.'
      );

      return;
    }

    if (!canSelectTable(selectedTable)) {
      setBookingError(
        'This table is no longer available for your selected time.'
      );

      await loadAvailability();

      return;
    }

    const token = getToken();

    if (!token) {
      const returnUrl =
        `/restaurants/${restaurantId}/book?date=${date}&time=${time}&party_size=${partySize}`;

      router.push(
        `/login?redirect=${encodeURIComponent(
          returnUrl
        )}`
      );

      return;
    }

    const user = getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setBooking(true);

    try {
      const notes = occasion
        ? `Occasion: ${occasion}`
        : undefined;

      const response =
        await apiFetch<ReservationResponse>(
          '/reservations',
          {
            method: 'POST',

            headers: {
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              restaurant_id: restaurantId,

              table_id: selectedTable.id,

              party_size: partySize,

              reservation_date: date,

              reservation_time: time,

              notes,

              special_requests:
                specialRequests || undefined,
            }),
          }
        );

      const reservationId =
        response.data?.id;

      if (reservationId) {
        router.push(
          `/reservations/${reservationId}`
        );
      } else {
        router.push('/reservations');
      }
    } catch (err) {
      console.error(
        'Reservation creation error:',
        err
      );

      setBookingError(
        err instanceof Error
          ? err.message
          : 'Unable to create your reservation.'
      );

      /*
       * Refresh availability because another diner
       * may have booked the table.
       */
      await loadAvailability();
    } finally {
      setBooking(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* RESTAURANT LOCATION                                                    */
  /* ---------------------------------------------------------------------- */

  const restaurantLocation =
    restaurant?.location ||
    restaurant?.address ||
    restaurant?.city ||
    'Addis Ababa, Ethiopia';

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcf9f8] pt-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-16 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-xl w-2/3" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 h-[520px] bg-gray-200 rounded-xl" />

              <div className="lg:col-span-4 h-[520px] bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* ERROR                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error || !restaurant) {
    return (
      <main className="min-h-screen bg-[#fcf9f8] pt-20">
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#f0edec] flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-2xl text-[#01261f]">
              restaurant
            </span>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#01261f]">
            Unable to load restaurant
          </h1>

          <p className="mt-3 text-gray-600">
            {error ||
              'The restaurant could not be found.'}
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-8 px-6 py-3 rounded-lg bg-[#01261f] text-white font-semibold"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b]">

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fcf9f8]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 px-5 lg:px-16 flex items-center justify-between">

          <div className="flex items-center gap-6">

            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-3 group"
            >
              <div className="h-8 w-8 rounded-md bg-[#1a3c34] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px]">
                  restaurant
                </span>
              </div>

              <span className="font-serif text-2xl font-semibold tracking-tight text-[#01261f]">
                DINEET
              </span>
            </button>

            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f6f3f2] text-[#414846]">
              <span className="material-symbols-outlined text-[18px] text-[#934a2d]">
                location_on
              </span>

              <span className="text-xs font-semibold tracking-wide">
                Addis Ababa
              </span>
            </div>

          </div>

          <nav className="hidden md:flex items-center gap-2 lg:gap-4">

            <button
              type="button"
              onClick={() =>
                router.push('/restaurants')
              }
              className="px-3 py-2 text-sm font-semibold text-[#414846] hover:text-[#1c1b1b]"
            >
              Explore
            </button>

            <button
              type="button"
              onClick={() =>
                router.push('/reservations')
              }
              className="px-4 py-2 rounded-full bg-[#1a3c34] text-white text-sm font-semibold"
            >
              Reservations
            </button>

            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold text-[#414846] hover:text-[#1c1b1b]"
            >
              Experiences
            </button>

            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold text-[#414846] hover:text-[#1c1b1b]"
            >
              About
            </button>

          </nav>

          <button
            type="button"
            onClick={() =>
              router.push('/profile')
            }
            className="w-8 h-8 rounded-full bg-[#01261f] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-white text-[18px]">
              person
            </span>
          </button>

        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN                                                               */}
      {/* ================================================================== */}

      <main className="w-full pt-20 min-h-screen">

        {/* ---------------------------------------------------------------- */}
        {/* RESERVATION SUMMARY BAR                                          */}
        {/* ---------------------------------------------------------------- */}

        <div className="w-full bg-white shadow-sm py-4 px-5 lg:px-16">

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <span className="w-2.5 h-2.5 rounded-full bg-[#934a2d]" />

              <span className="font-serif text-xl font-semibold text-[#01261f]">
                {restaurant.name}
              </span>

              <span className="hidden sm:inline text-sm text-[#414846]">
                {restaurantLocation}
              </span>

            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 bg-[#f6f3f2] px-4 py-2 rounded-full">

              {/* DATE */}

              <label className="flex items-center gap-1.5 text-sm font-semibold">

                <span className="material-symbols-outlined text-[16px] text-[#934a2d]">
                  calendar_today
                </span>

                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedTableId(null);
                  }}
                  className="bg-transparent outline-none cursor-pointer"
                />

              </label>

              <span className="text-[#c1c8c4]">
                •
              </span>

              {/* TIME */}

              <label className="flex items-center gap-1.5 text-sm font-semibold">

                <span className="material-symbols-outlined text-[16px] text-[#934a2d]">
                  schedule
                </span>

                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    setSelectedTableId(null);
                  }}
                  className="bg-transparent outline-none cursor-pointer"
                />

              </label>

              <span className="text-[#c1c8c4]">
                •
              </span>

              {/* PARTY SIZE */}

              <label className="flex items-center gap-1.5 text-sm font-semibold">

                <span className="material-symbols-outlined text-[16px] text-[#934a2d]">
                  group
                </span>

                <select
                  value={partySize}
                  onChange={(e) => {
                    setPartySize(
                      Number(e.target.value)
                    );

                    setSelectedTableId(null);
                  }}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  {Array.from(
                    { length: 12 },
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

              </label>

            </div>

          </div>

        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-16 py-8">

          {/* ================================================================ */}
          {/* PROGRESS                                                         */}
          {/* ================================================================ */}

          <div className="mb-10">

            <div className="relative max-w-4xl mx-auto">

              <div className="absolute top-5 left-0 w-full h-[2px] bg-[#f0edec]" />

              <div className="relative z-10 flex items-start justify-between">

                {[
                  ['1', 'Table & Seating', true],
                  ['2', 'Guest & Occasion', false],
                  ['3', 'Special Requests', false],
                  ['4', 'Deposit', false],
                  ['5', 'Confirmed', false],
                ].map(
                  ([number, label, active]) => (
                    <div
                      key={String(number)}
                      className="flex flex-col items-center gap-2"
                    >

                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-[#fcf9f8] ${
                          active
                            ? 'bg-[#01261f] text-white shadow-md'
                            : 'bg-[#ebe7e7] text-[#414846]'
                        }`}
                      >
                        {number}
                      </div>

                      <span
                        className={`text-xs sm:text-sm font-semibold ${
                          active
                            ? 'text-[#01261f]'
                            : 'text-[#414846]'
                        } ${
                          number !== '1'
                            ? 'hidden sm:inline'
                            : ''
                        }`}
                      >
                        {label}
                      </span>

                    </div>
                  )
                )}

              </div>

            </div>

          </div>

          {/* ================================================================ */}
          {/* CONTENT GRID                                                     */}
          {/* ================================================================ */}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ============================================================ */}
            {/* LEFT                                                          */}
            {/* ============================================================ */}

            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* TITLE + LEGEND */}

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">

                <div>

                  <span className="text-xs text-[#934a2d] uppercase tracking-[0.18em] font-semibold block mb-1">
                    Step 01 • Curated Placement
                  </span>

                  <h1 className="font-serif text-3xl text-[#01261f] font-semibold">
                    Choose Your Seating Atmosphere
                  </h1>

                </div>

                <div className="flex items-center gap-4 bg-[#f6f3f2] px-4 py-2 rounded-full">

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#01261f]" />
                    <span className="text-xs text-[#414846]">
                      Available
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#934a2d]" />
                    <span className="text-xs text-[#414846]">
                      Reserved
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dcd9d9]" />
                    <span className="text-xs text-[#414846]">
                      Occupied
                    </span>
                  </div>

                </div>

              </div>

              {/* ============================================================ */}
              {/* ZONES                                                         */}
              {/* ============================================================ */}

              <div className="flex items-center gap-2 overflow-x-auto pb-2">

                {[
                  ['all', 'All Atmospheres'],
                  ['window', 'Window View Booths'],
                  ['terrace', 'Terrace & Garden'],
                  ['mesob', 'Private Mesob Lounge'],
                  ['main', 'Main Dining Hall'],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setActiveZone(value)
                      }
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                        activeZone === value
                          ? 'bg-[#01261f] text-white shadow-sm'
                          : 'bg-[#f6f3f2] text-[#414846] hover:text-[#1c1b1b]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}

              </div>

              {/* ============================================================ */}
              {/* TABLE MAP                                                     */}
              {/* ============================================================ */}

              <div className="relative bg-white rounded-xl shadow-md p-6 overflow-hidden min-h-[440px]">

                <div
                  className="absolute inset-0 opacity-[0.035] pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(#01261f 1px, transparent 1px)',
                    backgroundSize:
                      '24px 24px',
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[#414846] relative z-10 pb-4 border-b border-[#f0edec]">

                  <div className="flex items-center gap-2">

                    <span className="material-symbols-outlined text-[18px]">
                      grid_view
                    </span>

                    <span className="text-xs tracking-wider uppercase font-semibold">
                      {restaurantLocation}
                    </span>

                  </div>

                  <span className="text-xs italic text-[#934a2d]">
                    Live Table Availability
                  </span>

                </div>

                {availabilityLoading && (
                  <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">

                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-lg">

                      <div className="w-5 h-5 border-2 border-[#01261f] border-t-transparent rounded-full animate-spin" />

                      <span className="text-sm font-semibold text-[#01261f]">
                        Checking availability...
                      </span>

                    </div>

                  </div>
                )}

                {/* TABLES */}

                {filteredTables.length === 0 ? (
                  <div className="min-h-[320px] flex flex-col items-center justify-center text-center">

                    <div className="w-14 h-14 rounded-full bg-[#f6f3f2] flex items-center justify-center">

                      <span className="material-symbols-outlined text-[#01261f] text-2xl">
                        table_restaurant
                      </span>

                    </div>

                    <h3 className="mt-4 font-serif text-xl font-semibold text-[#01261f]">
                      No tables found
                    </h3>

                    <p className="mt-2 text-sm text-[#414846]">
                      Try another atmosphere or change
                      your reservation time.
                    </p>

                  </div>
                ) : (
                  <div className="relative z-10 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                    {filteredTables.map(
                      (table) => {
                        const status =
                          getTableStatus(
                            table
                          );

                        const selected =
                          selectedTableId ===
                          table.id;

                        const selectable =
                          canSelectTable(
                            table
                          );

                        const number =
                          normalizeTableNumber(
                            table
                          );

                        /*
                         * IMPORTANT:
                         * seating is now guaranteed to be a string.
                         */
                        const seating =
                          getSeatingLabel(
                            table
                          );

                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={!selectable}
                            onClick={() =>
                              selectTable(
                                table
                              )
                            }
                            className={`group relative text-left rounded-xl p-4 border transition-all duration-300 ${
                              selected
                                ? 'border-[#01261f] bg-[#f6f3f2] shadow-lg ring-2 ring-[#c5eadf]'
                                : selectable
                                ? 'border-[#e5e2e1] bg-white hover:border-[#01261f] hover:shadow-md'
                                : 'border-[#ebe7e7] bg-[#f6f3f2] opacity-70 cursor-not-allowed'
                            }`}
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <div className="flex items-center gap-2">

                                  <span
                                    className={`w-3 h-3 rounded-full ${
                                      status ===
                                      'available'
                                        ? 'bg-[#01261f]'
                                        : status ===
                                          'reserved'
                                        ? 'bg-[#934a2d]'
                                        : 'bg-[#dcd9d9]'
                                    }`}
                                  />

                                  <span className="font-semibold text-[#01261f]">
                                    Table {number}
                                  </span>

                                </div>

                                <span className="mt-1 block text-xs text-[#414846]">
                                  {seating}
                                </span>

                              </div>

                              {selected && (
                                <span className="bg-[#01261f] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                                  Selected
                                </span>
                              )}

                              {!selected &&
                                status ===
                                  'available' && (
                                  <span className="bg-[#c5eadf] text-[#01261f] text-[10px] font-bold px-2 py-1 rounded-full">
                                    Available
                                  </span>
                                )}

                              {status ===
                                'reserved' && (
                                <span className="bg-[#934a2d] text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full">
                                  Reserved
                                </span>
                              )}

                              {status ===
                                'occupied' && (
                                <span className="bg-[#e5e2e1] text-[#414846] text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full">
                                  Occupied
                                </span>
                              )}

                            </div>

                            <div
                              className={`mt-5 h-20 rounded-lg flex flex-col items-center justify-center transition-transform ${
                                selectable
                                  ? 'group-hover:scale-[1.02]'
                                  : ''
                              } ${
                                selected
                                  ? 'bg-[#01261f] text-white'
                                  : status ===
                                    'available'
                                  ? 'bg-[#f0edec] text-[#01261f]'
                                  : 'bg-[#e5e2e1] text-[#717976]'
                              }`}
                            >

                              <span className="material-symbols-outlined text-xl">
                                table_restaurant
                              </span>

                              <span className="text-xs font-semibold mt-1">
                                {table.capacity}{' '}
                                {table.capacity ===
                                1
                                  ? 'Seat'
                                  : 'Seats'}
                              </span>

                            </div>

                            <div className="mt-3 text-xs text-[#414846]">
                              {getCapacityLabel(
                                table.capacity
                              )}
                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>
                )}

                {/* TABLE COUNT */}

                <div className="flex flex-wrap items-center justify-between gap-3 text-[#414846] pt-4 border-t border-[#f0edec] text-xs">

                  <span className="flex items-center gap-1">

                    <span className="material-symbols-outlined text-[14px]">
                      touch_app
                    </span>

                    Select an available table

                  </span>

                  <span className="text-[#01261f] font-semibold">
                    {availableTableIds.length}{' '}
                    available
                  </span>

                </div>

              </div>

              {/* ============================================================ */}
              {/* SELECTED TABLE DETAILS                                       */}
              {/* ============================================================ */}

              {selectedTable && (
                <div className="bg-white rounded-xl p-6 shadow-md">

                  <div className="flex flex-col md:flex-row gap-6">

                    <div className="w-full md:w-48 h-32 rounded-lg bg-[#f6f3f2] flex items-center justify-center shrink-0">

                      <span className="material-symbols-outlined text-5xl text-[#01261f]">
                        table_restaurant
                      </span>

                    </div>

                    <div className="flex flex-col justify-between w-full">

                      <div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">

                          <div className="flex items-center gap-2">

                            <h3 className="font-serif text-2xl text-[#01261f] font-semibold">
                              Table{' '}
                              {normalizeTableNumber(
                                selectedTable
                              )}{' '}
                              —{' '}
                              {getSeatingLabel(
                                selectedTable
                              )}
                            </h3>

                            <span className="material-symbols-outlined text-[#934a2d] text-[20px]">
                              star
                            </span>

                          </div>

                          <span className="px-3 py-1 rounded-full bg-[#c5eadf] text-[#01261f] text-xs font-semibold whitespace-nowrap">
                            {getCapacityLabel(
                              selectedTable.capacity
                            )}
                          </span>

                        </div>

                        <p className="text-sm leading-relaxed text-[#414846] mb-4">
                          {getTableDescription(
                            selectedTable
                          )}
                        </p>

                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#f0edec]">

                        <div>

                          <span className="text-[10px] text-[#414846] uppercase tracking-wider block">
                            Seating Type
                          </span>

                          <span className="text-sm text-[#1c1b1b] font-semibold">
                            {selectedTable.seating_type ||
                              'Standard Dining'}
                          </span>

                        </div>

                        <div>

                          <span className="text-[10px] text-[#414846] uppercase tracking-wider block">
                            Capacity
                          </span>

                          <span className="text-sm text-[#1c1b1b] font-semibold">
                            {selectedTable.capacity}{' '}
                            seats
                          </span>

                        </div>

                        <div>

                          <span className="text-[10px] text-[#414846] uppercase tracking-wider block">
                            Availability
                          </span>

                          <span className="text-sm text-[#01261f] font-semibold">
                            Available
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* ============================================================ */}
              {/* GUEST + OCCASION                                             */}
              {/* ============================================================ */}

              <div className="bg-white rounded-xl p-6 shadow-md">

                <div className="mb-5">

                  <span className="text-xs text-[#934a2d] uppercase tracking-widest font-semibold">
                    Step 02 • Guest & Occasion
                  </span>

                  <h2 className="font-serif text-2xl text-[#01261f] font-semibold mt-1">
                    Make Your Reservation Personal
                  </h2>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>

                    <label className="block text-xs font-semibold text-[#414846] mb-2">
                      Occasion
                    </label>

                    <select
                      value={occasion}
                      onChange={(e) =>
                        setOccasion(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-4 py-3 text-sm outline-none focus:border-[#01261f]"
                    >

                      <option value="">
                        No special occasion
                      </option>

                      <option value="Birthday">
                        Birthday
                      </option>

                      <option value="Anniversary">
                        Anniversary
                      </option>

                      <option value="Date Night">
                        Date Night
                      </option>

                      <option value="Business Dinner">
                        Business Dinner
                      </option>

                      <option value="Celebration">
                        Celebration
                      </option>

                    </select>

                  </div>

                  <div>

                    <label className="block text-xs font-semibold text-[#414846] mb-2">
                      Special Requests
                    </label>

                    <input
                      type="text"
                      value={specialRequests}
                      onChange={(e) =>
                        setSpecialRequests(
                          e.target.value
                        )
                      }
                      placeholder="Window seat, accessibility, etc."
                      className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-4 py-3 text-sm outline-none focus:border-[#01261f]"
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* ============================================================ */}
            {/* RIGHT SIDEBAR                                                 */}
            {/* ============================================================ */}

            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-28">

              <div className="bg-white rounded-xl p-6 shadow-xl flex flex-col gap-6">

                <div className="pb-4 border-b border-[#f0edec]">

                  <span className="text-xs text-[#934a2d] uppercase tracking-wider font-semibold">
                    Reservation Overview
                  </span>

                  <h2 className="font-serif text-2xl text-[#01261f] mt-1 font-semibold">
                    Summary
                  </h2>

                </div>

                <div className="space-y-4">

                  {/* VENUE */}

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 rounded-full bg-[#f0edec] flex items-center justify-center shrink-0">

                      <span className="material-symbols-outlined text-[#01261f] text-[18px]">
                        restaurant
                      </span>

                    </div>

                    <div>

                      <span className="text-[10px] text-[#414846] block">
                        Venue
                      </span>

                      <span className="text-sm text-[#1c1b1b] font-bold">
                        {restaurant.name}
                      </span>

                      <span className="text-sm text-[#414846] block">
                        {restaurantLocation}
                      </span>

                    </div>

                  </div>

                  {/* SCHEDULE */}

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 rounded-full bg-[#f0edec] flex items-center justify-center shrink-0">

                      <span className="material-symbols-outlined text-[#01261f] text-[18px]">
                        event
                      </span>

                    </div>

                    <div>

                      <span className="text-[10px] text-[#414846] block">
                        Schedule & Party
                      </span>

                      <span className="text-sm text-[#1c1b1b] font-semibold">
                        {formatDateForDisplay(
                          date
                        )}
                      </span>

                      <span className="text-sm text-[#1c1b1b] font-semibold block">
                        {formatTimeForDisplay(
                          time
                        )}
                      </span>

                      <span className="text-sm text-[#414846] block">
                        Party of {partySize}{' '}
                        {partySize === 1
                          ? 'guest'
                          : 'guests'}
                      </span>

                    </div>

                  </div>

                  {/* SELECTED TABLE */}

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 rounded-full bg-[#f0edec] flex items-center justify-center shrink-0">

                      <span className="material-symbols-outlined text-[#01261f] text-[18px]">
                        chair
                      </span>

                    </div>

                    <div>

                      <span className="text-[10px] text-[#414846] block">
                        Selected Table
                      </span>

                      {selectedTable ? (
                        <>
                          <span className="text-sm text-[#01261f] font-bold">
                            Table{' '}
                            {normalizeTableNumber(
                              selectedTable
                            )}
                          </span>

                          <span className="text-sm text-[#414846] block">
                            {getSeatingLabel(
                              selectedTable
                            )}{' '}
                            •{' '}
                            {selectedTable.capacity}{' '}
                            seats
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-[#414846]">
                          Choose a table
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* DEPOSIT */}

                <div className="bg-[#f6f3f2] p-4 rounded-lg flex flex-col gap-2">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-[#1c1b1b]">
                      Reservation Deposit
                    </span>

                    <span className="text-sm text-[#01261f] font-bold">
                      500 ETB
                    </span>

                  </div>

                  <div className="flex items-center justify-between text-[#414846] text-xs">

                    <span>
                      Service & Reservation Hold
                    </span>

                    <span>
                      Refundable*
                    </span>

                  </div>

                  <p className="text-[11px] text-[#414846] mt-1 leading-relaxed">
                    * Deposit information shown here
                    follows the reservation design.
                    Final payment handling can be
                    configured by the restaurant.
                  </p>

                </div>

                {/* ERROR */}

                {bookingError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {bookingError}
                  </div>
                )}

                {/* CONTINUE */}

                <div className="flex flex-col gap-3 pt-2">

                  <button
                    type="button"
                    onClick={continueReservation}
                    disabled={
                      booking ||
                      !selectedTable ||
                      availabilityLoading
                    }
                    className="w-full py-4 px-6 rounded-lg bg-[#01261f] hover:bg-[#01261f]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-center font-semibold transition-all duration-200 shadow-md flex items-center justify-center gap-2 group"
                  >

                    {booking ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />

                        <span>
                          Confirming...
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Continue to Guest & Occasion
                        </span>

                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </>
                    )}

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/restaurants/${restaurantId}`
                      )
                    }
                    className="w-full py-2.5 text-center text-sm font-semibold text-[#414846] hover:text-[#01261f] transition-colors flex items-center justify-center gap-1.5"
                  >

                    <span className="material-symbols-outlined text-[16px]">
                      chevron_left
                    </span>

                    <span>
                      Back to Restaurant Details
                    </span>

                  </button>

                </div>

                {/* SECURITY */}

                <div className="flex items-center justify-center gap-2 text-[#414846]/70 text-xs pt-2">

                  <span className="material-symbols-outlined text-[14px]">
                    shield
                  </span>

                  <span>
                    Live availability checked before booking
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      <footer className="w-full bg-[#f6f3f2] mt-12">

        <div className="w-full px-5 lg:px-16 py-12">

          <div className="max-w-7xl mx-auto">

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6">

              <div className="space-y-2">

                <div className="flex items-center gap-3">

                  <div className="h-7 w-7 rounded-md bg-[#1a3c34] flex items-center justify-center">

                    <span className="material-symbols-outlined text-white text-[16px]">
                      restaurant
                    </span>

                  </div>

                  <span className="font-serif text-xl text-[#01261f] font-semibold">
                    DINEET
                  </span>

                </div>

                <p className="text-sm text-[#934a2d] italic">
                  Ethiopian Hospitality Reimagined
                </p>

              </div>

              <nav className="flex flex-wrap items-center gap-5">

                <button
                  type="button"
                  className="text-sm text-[#414846] hover:text-[#1c1b1b]"
                >
                  About
                </button>

                <button
                  type="button"
                  className="text-sm text-[#414846] hover:text-[#1c1b1b]"
                >
                  For Restaurants
                </button>

                <button
                  type="button"
                  className="text-sm text-[#414846] hover:text-[#1c1b1b]"
                >
                  Contact
                </button>

                <button
                  type="button"
                  className="text-sm text-[#414846] hover:text-[#1c1b1b]"
                >
                  Privacy
                </button>

                <button
                  type="button"
                  className="text-sm text-[#414846] hover:text-[#1c1b1b]"
                >
                  Terms
                </button>

              </nav>

            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[#414846]">

              <span className="text-xs">
                © 2026 DINEET Hospitality Technologies.
                All rights reserved.
              </span>

              <span className="text-xs">
                Addis Ababa, Ethiopia
              </span>

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
}