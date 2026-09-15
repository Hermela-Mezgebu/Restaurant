'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

interface Table {
  id: number;
  table_number?: string | number | null;
  number?: string | number | null;
  capacity: number;
  seating_type?: string | null;
  [key: string]: unknown;
}

interface Reservation {
  id: number;
  status?: string | null;
  restaurant_id?: number;
  table_id?: number | null;
  user_id?: number;
  party_size?: number;
  reservation_date?: string | null;
  reservation_time?: string | null;
  date?: string | null;
  time?: string | null;
  notes?: string | null;
  special_requests?: string | null;

  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  restaurant?: Restaurant | null;
  table?: Table | null;

  [key: string]: unknown;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
}

interface ReservationCustomization {
  occasion?: string;
  occasion_label?: string;
  celebrant_name?: string;
  celebrant_relation?: string;
  birthday_candle?: boolean;
  notification_dispatch?: boolean;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
}

interface ReservationRequests {
  selected_addons?: string[];
  addon_total?: number;
  dietary?: string[];
  special_notes?: string;
  accessibility?: string[];
}

interface ReservationPayment {
  payment_method?: string;
  payment_phone?: string;
  amount?: number;
  deposit?: number;
  addon_total?: number;
  status?: string;
}

const logo =
  'https://lh3.googleusercontent.com/aida/AEtjO1VmiDA6kGweXDO2uMwdqC1f5e9YN0GTQDKd9-UObpJ06dvmq89ZaNRhRxH3AxctZOAa5kIwjZU-_0tU0f0fMLzewvaEHzU1us2hYmULtN0LFE417dAC6GciXT0MS48A7Icl-7E1gqWGrmf7WeITtFv9E_VMOWOhikyCJ0n6WlrANnFJ22VSlfQnIQfg52HUMokEC7yNsnGUyhkKm-8bB9b8Zecl57kylrakP7q98zPEW5VRXCphSP2AW30';

const ambienceImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAsV39SRiXjQ1KaQAVjODvpX00TKn1XaN6jYPL3buh1s2G-c2nEWvyTdsAuOjHUIFFiA6SAsSJ52LMlZYV2Qvp6Qum4izZLDjotsPOtQc5DJSoM5cb2ZvUoxFsYbEdXzYVTds1cU6UuueXAmUM7p-9X4DNsE0Nzm18iBzAeUm1CcVmobSHNvzl1zHZSxiQU1RQwcDUmg5ifrtK2G_hRoKkcOxO-fJq3WWJVf74gmE9bBaQvkLI-_sD4';

const coffeeImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6i5KPJ09TQ2ctps8JaiFjOPFuxV4w8A3X7A_hgjETrtdc73Mb-JJryRL7M0eFulT86dbnliRwgZAlc7E7a5EiTFgZ5Qrtbl3o7WZT_1rfZI5IwpqnePTw84Z5qll5TJHSYJDGanAy--DcJE1VVKEWG3kET4kezjPuMjRIg-2W1ziLF01aVK5R10sy5-RAfcCpJ_aMAp3P8QswGD5UjI3HOwfGXg_bVBHfZh3bTAhTWHckMeQvmdLY';

const feastImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuARJuEIkhkD7osYxr8tbmJwQAwG7_20Dy_3-Y6uDkuw5KtPMSC_uWHJonn_acrZouvxHVhZNfRmRDsIlUgTss_TAFpIQCrYkec4j6Xc4pzvDmOQN4XJe3LeQDSddSLnG-Na4TNvRObIRUxd0WYTFk5VSWEhVNorpRbXa-MOta2yTWTzNsjvXSDCzQ6GBkVyjVSB6TsFIc-rH7ydGiFKzz9nzD6QTPKqE3VF2_IvfS6QkculmP0gRp1W';

const locationImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2ZW26UISXxklLTVHcX5YBMJJ7R290NOL9xcOJayesQFkX6VLKYHflZlqT7d-0XRSctHSE8mObasN_lHzcE8DMqOqqvkm6W4LO2P3oTsa-A03w9VZNGh4B7gCZ4zcjy_knArKKuD21p4sOOzJFpCswN6aMb7soSrGa2fsfVyVCWGi1w66JpyReBob3vdVNWmF0lC2zKzrMh6Dbb7Rt1SF0pGZAMIsF36J3Uk0K76LF2vAckityLTB-';

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function tableNumber(table?: Table | null) {
  if (!table) return '—';

  return String(
    table.table_number ?? table.number ?? table.id
  ).padStart(2, '0');
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable';

  const date = new Date(
    value.includes('T') ? value : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return 'Time unavailable';

  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status?: string | null) {
  const value = String(status || 'pending').toLowerCase();

  if (value === 'confirmed') return 'Confirmed';
  if (value === 'seated') return 'Checked in';
  if (value === 'completed') return 'Completed';
  if (value === 'declined') return 'Declined';
  if (value === 'cancelled' || value === 'canceled') {
    return 'Cancelled';
  }

  return 'Reservation received';
}

function statusIsConfirmed(status?: string | null) {
  return ['confirmed', 'seated'].includes(
    String(status || '').toLowerCase()
  );
}

function reservationCode(reservation: Reservation) {
  return `DIN-${String(reservation.id).padStart(4, '0')}`;
}

function buildReservationPayload(
  restaurantId: number,
  tableId: number,
  date: string,
  time: string,
  partySize: number,
  customization: ReservationCustomization,
  requests: ReservationRequests
) {
  const requestParts = [
    customization.occasion_label
      ? `Occasion: ${customization.occasion_label}${
          customization.celebrant_name
            ? ` — ${customization.celebrant_name}`
            : ''
        }`
      : '',

    customization.celebrant_relation
      ? `Celebrant relation: ${customization.celebrant_relation}`
      : '',

    customization.birthday_candle
      ? 'Birthday candle requested.'
      : '',

    requests.dietary?.length
      ? `Dietary needs: ${requests.dietary.join(', ')}`
      : '',

    requests.accessibility?.length
      ? `Accessibility: ${requests.accessibility.join(', ')}`
      : '',

    requests.selected_addons?.length
      ? `Requested experiences: ${requests.selected_addons.join(', ')}`
      : '',

    requests.special_notes || '',
  ].filter(Boolean);

  return {
    restaurant_id: restaurantId,
    table_id: tableId,
    party_size: partySize,
    reservation_date: date,
    reservation_time: time,

    notes: requestParts.join('\n'),

    special_requests: [
      customization.notification_dispatch
        ? 'Send reservation notifications.'
        : '',

      customization.guest_phone
        ? `Guest phone: ${customization.guest_phone}`
        : '',

      requests.special_notes || '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export default function ConfirmationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const tableId = Number(
    searchParams.get('table_id') || 0
  );

  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  const partySize = Number(
    searchParams.get('party_size') || 2
  );

  const existingReservationId = Number(
    searchParams.get('reservation_id') || 0
  );

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [table, setTable] =
    useState<Table | null>(null);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [customization, setCustomization] =
    useState<ReservationCustomization>({});

  const [requests, setRequests] =
    useState<ReservationRequests>({});

  const [payment, setPayment] =
    useState<ReservationPayment>({});

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState('');

  const [toast, setToast] =
    useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast('');
    }, 3200);
  }, []);

  const loadReservation = useCallback(
    async (reservationId: number) => {
      const response =
        await apiFetch<ApiResponse<Reservation>>(
          `/reservations/${reservationId}`
        );

      if (!response.data) {
        throw new Error(
          'Reservation was not returned by the server.'
        );
      }

      setReservation(response.data);

      return response.data;
    },
    []
  );

  const createOrLoadReservation =
    useCallback(async () => {
      if (!getToken()) {
        router.replace(
          `/login?redirect=${encodeURIComponent(
            window.location.pathname +
              window.location.search
          )}`
        );

        return;
      }

      if (
        !restaurantId ||
        !tableId ||
        !date ||
        !time ||
        !partySize
      ) {
        setError(
          'The booking details are incomplete. Please return to the table selection step.'
        );

        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [
          restaurantResponse,
          tablesResponse,
        ] = await Promise.all([
          apiFetch<ApiResponse<Restaurant>>(
            `/restaurants/${restaurantId}`
          ),

          apiFetch<ApiResponse<Table[]>>(
            `/restaurants/${restaurantId}/tables`
          ),
        ]);

        const restaurantData =
          restaurantResponse.data ?? null;

        const tableData =
          (tablesResponse.data ?? []).find(
            (item) => item.id === tableId
          ) ?? null;

        setRestaurant(restaurantData);
        setTable(tableData);

        const custom =
          readSession<ReservationCustomization>(
            `reservation_customization_${restaurantId}_${tableId}`,
            {}
          );

        const req =
          readSession<ReservationRequests>(
            `reservation_requests_${restaurantId}_${tableId}`,
            {}
          );

        const savedPayment =
          readSession<ReservationPayment>(
            `reservation_payment_${restaurantId}_${tableId}`,
            {}
          );

        setCustomization(custom);
        setRequests(req);
        setPayment(savedPayment);

        /*
         * If Step 5 receives an existing reservation_id,
         * load that reservation instead of creating another one.
         */
        if (existingReservationId) {
          await loadReservation(
            existingReservationId
          );

          return;
        }

        /*
         * Prevent duplicate reservations when the user
         * refreshes Step 5.
         */
        const sessionKey =
          `reservation_created_${restaurantId}_${tableId}_${date}_${time}_${partySize}`;

        const existingId = Number(
          sessionStorage.getItem(sessionKey) || 0
        );

        if (existingId) {
          await loadReservation(existingId);

          return;
        }

        setCreating(true);

        const payload =
          buildReservationPayload(
            restaurantId,
            tableId,
            date,
            time,
            partySize,
            custom,
            req
          );

        /*
         * The current Laravel backend creates the
         * reservation here. Payment remains separate
         * because no real payment gateway endpoint
         * currently exists in the backend.
         */
        const response =
          await apiFetch<ApiResponse<Reservation>>(
            '/reservations',
            {
              method: 'POST',
              body: JSON.stringify(payload),
            }
          );

        if (!response.data) {
          throw new Error(
            response.message ||
              'The reservation could not be created.'
          );
        }

        setReservation(response.data);

        sessionStorage.setItem(
          sessionKey,
          String(response.data.id)
        );

        /*
         * The reservation now exists on the backend,
         * so Step 2 and Step 3 temporary data are no
         * longer required.
         */
        sessionStorage.removeItem(
          `reservation_customization_${restaurantId}_${tableId}`
        );

        sessionStorage.removeItem(
          `reservation_requests_${restaurantId}_${tableId}`
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to create or load your reservation.'
        );
      } finally {
        setCreating(false);
        setLoading(false);
      }
    }, [
      restaurantId,
      tableId,
      date,
      time,
      partySize,
      existingReservationId,
      router,
      loadReservation,
    ]);

  useEffect(() => {
    void createOrLoadReservation();
  }, [createOrLoadReservation]);

  const reservationDate =
    reservation?.reservation_date ??
    reservation?.date ??
    date;

  const reservationTime =
    reservation?.reservation_time ??
    reservation?.time ??
    time;

  const guestName =
    reservation?.user?.name ||
    customization.guest_name ||
    getUser()?.name ||
    'Guest';

  const guestPhone =
    reservation?.user?.phone ||
    customization.guest_phone ||
    '';

  const actualRestaurant =
    reservation?.restaurant ?? restaurant;

  const actualTable =
    reservation?.table ?? table;

  const actualPartySize =
    reservation?.party_size ?? partySize;

  const code = reservation
    ? reservationCode(reservation)
    : 'DIN-—';

  const confirmed =
    statusIsConfirmed(reservation?.status);

  const deposit =
    Number(payment.deposit || 0);

  const addonTotal =
    Number(
      payment.addon_total ||
        requests.addon_total ||
        0
    );

  const paymentTotal =
    Number(
      payment.amount ||
        deposit + addonTotal
    );

  const occasionTitle = useMemo(() => {
    if (!customization.occasion_label) {
      return '';
    }

    return customization.celebrant_name
      ? `${customization.occasion_label} • ${customization.celebrant_name}`
      : customization.occasion_label;
  }, [customization]);

  const modifyBooking = () => {
    const query = new URLSearchParams();

    if (reservationDate) {
      query.set('date', reservationDate);
    }

    if (reservationTime) {
      query.set('time', reservationTime);
    }

    query.set(
      'party_size',
      String(actualPartySize)
    );

    router.push(
      `/restaurants/${restaurantId}/book?${query.toString()}`
    );
  };

  const cancelBooking = async () => {
    if (!reservation) return;

    const shouldCancel = window.confirm(
      'Are you sure you want to cancel this reservation?'
    );

    if (!shouldCancel) return;

    try {
      await apiFetch(
        `/reservations/${reservation.id}`,
        {
          method: 'DELETE',
        }
      );

      showToast(
        'Reservation cancelled successfully.'
      );

      router.push('/reservations');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel the reservation.'
      );
    }
  };

  const sharePass = async () => {
    const text =
      `${actualRestaurant?.name || 'Restaurant'} • ` +
      `Table ${tableNumber(actualTable)} • ` +
      `${formatTime(reservationTime)} • ` +
      `${code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title:
            `${actualRestaurant?.name || 'DINEET'} Reservation`,
          text,
          url: window.location.href,
        });
      } catch {
        // User cancelled the native share dialog.
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      showToast(
        'Reservation details copied to clipboard.'
      );
    } catch {
      showToast(
        'Unable to copy reservation details.'
      );
    }
  };

  const addToCalendar = () => {
    if (!reservationDate || !reservationTime) {
      return;
    }

    const start = new Date(
      `${reservationDate}T${reservationTime}`
    );

    const end = new Date(
      start.getTime() + 90 * 60 * 1000
    );

    const toCalendarDate = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');

    const location =
      actualRestaurant?.address ||
      actualRestaurant?.city ||
      '';

    const calendarUrl =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(
        `${actualRestaurant?.name || 'DINEET'} Reservation`
      )}` +
      `&dates=${toCalendarDate(start)}/${toCalendarDate(
        end
      )}` +
      `&details=${encodeURIComponent(
        `DINEET reservation ${code}. Table ${tableNumber(
          actualTable
        )}.`
      )}` +
      `&location=${encodeURIComponent(location)}`;

    window.open(
      calendarUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const mapUrl = useMemo(() => {
    const destination =
      actualRestaurant?.address ||
      actualRestaurant?.city ||
      'Addis Ababa';

    return `https://maps.google.com/?q=${encodeURIComponent(
      destination
    )}`;
  }, [
    actualRestaurant?.address,
    actualRestaurant?.city,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-body-md text-on-surface-variant">
        {creating
          ? 'Securing your reservation…'
          : 'Loading your reservation…'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 w-full px-container-padding-mobile lg:px-container-padding-desktop flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-3 group"
            onClick={() => router.push('/')}
          >
            <img
              alt="DINEET logo"
              className="h-8 w-auto object-contain"
              src={logo}
            />

            <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
              DINEET
            </span>
          </button>

          <div className="flex items-center gap-stack-sm">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                location_on
              </span>

              <span className="font-label-sm text-label-sm tracking-wide">
                {actualRestaurant?.city ||
                  'Addis Ababa'}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <canvas
            className="fixed inset-0 pointer-events-none z-40 w-full h-full"
            id="confetti-canvas"
            aria-hidden="true"
          />

          <div className="relative w-full overflow-hidden px-container-padding-mobile lg:px-container-padding-desktop pb-stack-lg">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-primary/10 via-secondary-container/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

            <div className="absolute top-96 -right-24 w-80 h-80 bg-tertiary-fixed/20 blur-3xl pointer-events-none -z-10 rounded-full" />

            <div className="max-w-6xl mx-auto flex flex-col items-center">
              <nav
                aria-label="Progress"
                className="w-full max-w-4xl my-6"
              >
                <ol className="grid grid-cols-5 gap-2 lg:gap-4 items-center">
                  {[
                    ['01', 'Table'],
                    ['02', 'Occasion'],
                    ['03', 'Requests'],
                    ['04', 'Payment'],
                    ['05', 'Confirmed'],
                  ].map(
                    ([number, label], index) => (
                      <li
                        key={number}
                        className="flex items-center gap-2 group"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
                            index < 4
                              ? 'bg-primary text-on-primary'
                              : 'bg-tertiary-container text-on-tertiary-container shadow-md'
                          }`}
                        >
                          {index < 4 ? (
                            <span className="material-symbols-outlined text-[16px]">
                              check
                            </span>
                          ) : (
                            <span
                              className="material-symbols-outlined text-[16px]"
                              style={{
                                fontVariationSettings:
                                  "'FILL' 1",
                              }}
                            >
                              stars
                            </span>
                          )}
                        </div>

                        <div className="hidden sm:flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant/80 uppercase">
                            {index === 4
                              ? '05 Active'
                              : number}
                          </span>

                          <span
                            className={`font-label-md text-label-md ${
                              index === 4
                                ? 'text-primary font-bold'
                                : 'text-primary font-semibold'
                            }`}
                          >
                            {label}
                          </span>
                        </div>

                        {index < 4 && (
                          <div className="flex-1 h-[2px] bg-primary/20 hidden md:block ml-2" />
                        )}
                      </li>
                    )
                  )}
                </ol>
              </nav>

              <section className="text-center max-w-2xl mt-4 mb-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high text-secondary">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{
                      fontVariationSettings:
                        "'FILL' 1",
                    }}
                  >
                    {confirmed
                      ? 'check_circle'
                      : 'schedule'}
                  </span>

                  <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase">
                    {confirmed
                      ? 'Instant Guest Confirmation'
                      : 'Reservation Received'}
                  </span>
                </div>

                <h1 className="font-display-lg text-display-lg text-primary tracking-tight">
                  {confirmed
                    ? 'You’re all set! Table Reserved'
                    : 'Your Table Request Is Received'}
                </h1>

                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Your reservation at{' '}
                  <span className="font-semibold text-on-surface">
                    {actualRestaurant?.name ||
                      'the restaurant'}
                  </span>{' '}
                  has been created.{' '}
                  {guestPhone ? (
                    <>
                      Your reservation details are
                      associated with{' '}
                      <span className="font-medium text-primary underline decoration-secondary decoration-2 underline-offset-4">
                        {guestPhone}
                      </span>
                      .
                    </>
                  ) : (
                    'You can view the live reservation status below.'
                  )}
                </p>

                {!confirmed && reservation && (
                  <p className="text-sm text-on-surface-variant">
                    Current server status:{' '}
                    <span className="font-semibold text-primary">
                      {statusLabel(
                        reservation.status
                      )}
                    </span>
                    . Payment is currently recorded
                    as a pending gateway selection because
                    the backend does not yet expose a live
                    payment confirmation endpoint.
                  </p>
                )}
              </section>

              {error && (
                <div className="w-full max-w-4xl mb-6 rounded-lg bg-error-container text-on-error-container px-4 py-3">
                  {error}
                </div>
              )}

              {reservation && (
                <div className="w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden mb-12">
                  <div className="bg-primary text-on-primary p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none select-none">
                      <svg
                        className="w-64 h-64 text-on-primary"
                        fill="currentColor"
                        viewBox="0 0 100 100"
                        aria-hidden="true"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          fill="none"
                          r="45"
                          stroke="currentColor"
                          strokeWidth="2"
                        />

                        <circle
                          cx="50"
                          cy="50"
                          fill="none"
                          r="30"
                          stroke="currentColor"
                          strokeWidth="2"
                        />

                        <circle
                          cx="50"
                          cy="50"
                          fill="none"
                          r="15"
                          stroke="currentColor"
                          strokeWidth="2"
                        />

                        <path
                          d="M50 0 L50 100 M0 50 L100 50"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>

                    <div className="space-y-1 relative z-10">
                      <div className="flex items-center gap-2 text-tertiary-fixed">
                        <span className="material-symbols-outlined text-[18px]">
                          verified
                        </span>

                        <span className="font-label-sm text-label-sm tracking-wider uppercase font-semibold">
                          DINEET Signature Mesob Pass
                        </span>
                      </div>

                      <h2 className="font-headline-md text-headline-md text-on-primary font-bold">
                        {actualRestaurant?.name ||
                          'Restaurant'}
                      </h2>

                      <p className="font-body-md text-body-md text-on-primary/80 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary-container">
                          location_on
                        </span>

                        {actualRestaurant?.address ||
                          actualRestaurant?.city ||
                          'Addis Ababa'}
                      </p>
                    </div>

                    <div className="bg-primary-container/80 backdrop-blur-md px-5 py-3 rounded-lg flex flex-col items-start md:items-end self-start md:self-auto shadow-inner relative z-10">
                      <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider">
                        Reservation PIN
                      </span>

                      <span className="font-display-lg text-display-lg-mobile text-tertiary-fixed font-mono tracking-widest leading-tight">
                        {code}
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-4 bg-surface-container-lowest flex items-center justify-between px-2">
                    <div className="w-5 h-5 bg-surface rounded-full -ml-4 shadow-inner" />

                    <div className="w-full border-t border-dashed border-outline-variant/60 mx-3" />

                    <div className="w-5 h-5 bg-surface rounded-full -mr-4 shadow-inner" />
                  </div>

                  <div className="p-6 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-surface-container-low">
                          <div className="flex items-center gap-2 text-secondary mb-1">
                            <span className="material-symbols-outlined text-[18px]">
                              calendar_today
                            </span>

                            <span className="font-label-sm text-label-sm font-semibold uppercase">
                              Schedule
                            </span>
                          </div>

                          <div className="font-headline-sm text-headline-sm text-on-surface">
                            {formatTime(
                              reservationTime
                            )}
                          </div>

                          <p className="font-body-md text-body-md text-on-surface-variant">
                            {formatDate(
                              reservationDate
                            )}
                          </p>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-container-low">
                          <div className="flex items-center gap-2 text-secondary mb-1">
                            <span className="material-symbols-outlined text-[18px]">
                              table_restaurant
                            </span>

                            <span className="font-label-sm text-label-sm font-semibold uppercase">
                              Party Allocation
                            </span>
                          </div>

                          <div className="font-headline-sm text-headline-sm text-on-surface">
                            {actualPartySize}{' '}
                            {actualPartySize === 1
                              ? 'Guest'
                              : 'Guests'}
                          </div>

                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Table{' '}
                            {tableNumber(
                              actualTable
                            )}
                            {actualTable?.seating_type
                              ? ` • ${actualTable.seating_type}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      {occasionTitle && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-container-high/60">
                          <span className="text-2xl mt-0.5">
                            {customization.occasion ===
                            'birthday'
                              ? '🎂'
                              : customization.occasion ===
                                  'anniversary'
                                ? '💍'
                                : '✨'}
                          </span>

                          <div>
                            <h3 className="font-label-md text-label-md text-primary font-bold">
                              {occasionTitle}
                            </h3>

                            <p className="font-body-md text-body-md text-on-surface-variant">
                              {customization.birthday_candle
                                ? 'Birthday candle requested for the table.'
                                : 'Your selected occasion is attached to this reservation.'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-lg bg-surface-container-low space-y-2">
                        <span className="font-label-sm text-label-sm uppercase font-semibold text-outline">
                          Requested Experiences &
                          Dining Needs
                        </span>

                        <ul className="space-y-2">
                          {requests.selected_addons
                            ?.length ? (
                            requests.selected_addons.map(
                              (item) => (
                                <li
                                  key={item}
                                  className="flex items-center gap-2 text-on-surface font-body-md text-body-md"
                                >
                                  <span className="material-symbols-outlined text-primary text-[18px]">
                                    local_cafe
                                  </span>

                                  <span>
                                    {item}
                                  </span>
                                </li>
                              )
                            )
                          ) : (
                            <li className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                info
                              </span>

                              <span>
                                No additional
                                experiences selected.
                              </span>
                            </li>
                          )}

                          {requests.dietary?.length ? (
                            <li className="flex items-center gap-2 text-on-surface font-body-md text-body-md">
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                eco
                              </span>

                              <span>
                                Dietary needs:{' '}
                                {requests.dietary.join(
                                  ', '
                                )}
                              </span>
                            </li>
                          ) : null}

                          {requests.accessibility?.length ? (
                            <li className="flex items-center gap-2 text-on-surface font-body-md text-body-md">
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                accessible
                              </span>

                              <span>
                                Accessibility:{' '}
                                {requests.accessibility.join(
                                  ', '
                                )}
                              </span>
                            </li>
                          ) : null}

                          {requests.special_notes ? (
                            <li className="flex items-center gap-2 text-on-surface font-body-md text-body-md">
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                edit_note
                              </span>

                              <span>
                                {requests.special_notes}
                              </span>
                            </li>
                          ) : null}
                        </ul>
                      </div>

                      <div className="p-4 rounded-lg bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                            <span className="material-symbols-outlined text-[20px]">
                              account_balance_wallet
                            </span>
                          </div>

                          <div>
                            <div className="font-label-md text-label-md text-on-surface font-bold">
                              {paymentTotal > 0
                                ? `Deposit Selected: ${paymentTotal.toLocaleString()} ETB`
                                : 'Deposit: Not recorded'}
                            </div>

                            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                              {payment.payment_method
                                ? `${payment.payment_method} • ${
                                    payment.status ||
                                    'pending'
                                  }`
                                : 'Payment gateway not connected'}
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 self-start sm:self-auto">
                          <span className="material-symbols-outlined text-[14px]">
                            {payment.status === 'paid'
                              ? 'check'
                              : 'schedule'}
                          </span>

                          {payment.status === 'paid'
                            ? 'Settled'
                            : 'Pending gateway'}
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-xl bg-surface-container text-center space-y-4 shadow-sm">
                      <div className="flex flex-col items-center">
                        <span className="font-label-sm text-label-sm uppercase font-bold text-primary tracking-wider mb-1">
                          Fast Contactless Arrival
                        </span>

                        <span className="font-body-md text-body-md text-on-surface-variant">
                          Present this pass at the
                          entrance
                        </span>
                      </div>

                      <div className="p-4 bg-white rounded-lg shadow-md flex items-center justify-center relative">
                        <svg
                          className="w-44 h-44 text-primary"
                          fill="currentColor"
                          viewBox="0 0 100 100"
                          aria-label={`Reservation code ${code}`}
                        >
                          <rect
                            fill="none"
                            height="26"
                            rx="4"
                            stroke="currentColor"
                            strokeWidth="4"
                            width="26"
                            x="5"
                            y="5"
                          />

                          <rect
                            height="14"
                            rx="2"
                            width="14"
                            x="11"
                            y="11"
                          />

                          <rect
                            fill="none"
                            height="26"
                            rx="4"
                            stroke="currentColor"
                            strokeWidth="4"
                            width="26"
                            x="69"
                            y="5"
                          />

                          <rect
                            height="14"
                            rx="2"
                            width="14"
                            x="75"
                            y="11"
                          />

                          <rect
                            fill="none"
                            height="26"
                            rx="4"
                            stroke="currentColor"
                            strokeWidth="4"
                            width="26"
                            x="5"
                            y="69"
                          />

                          <rect
                            height="14"
                            rx="2"
                            width="14"
                            x="11"
                            y="75"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="37"
                            y="8"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="47"
                            y="14"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="57"
                            y="8"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="37"
                            y="24"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="47"
                            y="24"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="8"
                            y="37"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="20"
                            y="37"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="26"
                            y="47"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="8"
                            y="57"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="20"
                            y="57"
                          />

                          <rect
                            fill="#01261f"
                            height="26"
                            rx="4"
                            width="26"
                            x="37"
                            y="37"
                          />

                          <circle
                            cx="50"
                            cy="50"
                            fill="#fcf9f8"
                            r="6"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="69"
                            y="37"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="79"
                            y="47"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="89"
                            y="37"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="37"
                            y="69"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="47"
                            y="79"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="37"
                            y="89"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="57"
                            y="69"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="69"
                            y="69"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="79"
                            y="79"
                          />

                          <rect
                            height="6"
                            width="6"
                            x="89"
                            y="89"
                          />
                        </svg>

                        <div className="absolute inset-x-4 top-4 h-0.5 bg-secondary opacity-70 animate-pulse" />
                      </div>

                      <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[16px]">
                          qr_code_scanner
                        </span>

                        <span>
                          {confirmed
                            ? 'Pass valid for your reservation'
                            : 'Show reservation code at arrival'}
                        </span>
                      </div>

                      <div className="w-full flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              'Wallet integration requires a connected wallet pass provider.'
                            )
                          }
                          className="w-full py-3 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            wallet
                          </span>

                          <span>
                            Add to Apple / Google Wallet
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={addToCalendar}
                          className="w-full py-2.5 px-4 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-highest transition"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            event
                          </span>

                          <span>
                            Add to Google Calendar
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-surface-container-high flex flex-wrap items-center justify-between gap-4 text-on-surface-variant font-label-sm text-label-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        security
                      </span>

                      <span>
                        Reservation identity matched to
                        your DINEET account
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="hover:text-primary transition flex items-center gap-1"
                        onClick={() => window.print()}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          print
                        </span>

                        Print Pass
                      </button>

                      <button
                        type="button"
                        className="hover:text-primary transition flex items-center gap-1"
                        onClick={sharePass}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          share
                        </span>

                        Share with Guests
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <section className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <a
                  className="p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container transition flex items-center gap-3 shadow-sm group"
                  href={mapUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                    <span className="material-symbols-outlined text-[20px]">
                      directions
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      Get Directions
                    </span>

                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {actualRestaurant?.address ||
                        actualRestaurant?.city ||
                        'Open Maps'}
                    </span>
                  </div>
                </a>

                <a
                  className="p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container transition flex items-center gap-3 shadow-sm group"
                  href={
                    actualRestaurant?.phone
                      ? `tel:${actualRestaurant.phone}`
                      : '#'
                  }
                  onClick={(event) => {
                    if (!actualRestaurant?.phone) {
                      event.preventDefault();
                    }
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                    <span className="material-symbols-outlined text-[20px]">
                      call
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      Contact Restaurant
                    </span>

                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {actualRestaurant?.phone ||
                        'Phone unavailable'}
                    </span>
                  </div>
                </a>

                <button
                  type="button"
                  className="p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container transition flex items-center gap-3 shadow-sm text-left group"
                  onClick={modifyBooking}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                    <span className="material-symbols-outlined text-[20px]">
                      edit_calendar
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      Modify Booking
                    </span>

                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      Time, guests or note
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container transition flex items-center gap-3 shadow-sm text-left group"
                  onClick={cancelBooking}
                >
                  <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center group-hover:scale-105 transition">
                    <span className="material-symbols-outlined text-[20px]">
                      cancel
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-error font-semibold truncate">
                      Cancel Reservation
                    </span>

                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      Cancel through DINEET
                    </span>
                  </div>
                </button>
              </section>

              <div className="w-full max-w-4xl p-6 rounded-xl bg-gradient-to-r from-primary via-primary-container to-primary text-on-primary shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow">
                    <span className="material-symbols-outlined text-[24px]">
                      military_tech
                    </span>
                  </div>

                  <div>
                    <div className="font-label-sm text-label-sm text-tertiary-fixed tracking-wider uppercase font-semibold">
                      DINEET Rewards
                    </div>

                    <div className="font-headline-sm text-headline-sm text-on-primary font-bold">
                      Reservation recorded
                    </div>

                    <p className="font-body-md text-body-md text-on-primary/80">
                      Your booking is now available
                      in My Reservations.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      router.push('/reservations')
                    }
                    className="px-5 py-2.5 rounded-full bg-surface text-primary hover:bg-white font-label-md text-label-md font-semibold transition shadow-sm whitespace-nowrap"
                  >
                    My Reservations
                  </button>
                </div>
              </div>

              <section className="w-full max-w-4xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">
                      Tonight’s Destination
                    </span>

                    <h3 className="font-headline-md text-headline-md text-primary font-bold">
                      What to expect at{' '}
                      {actualRestaurant?.name ||
                        'your venue'}
                    </h3>
                  </div>

                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {guestName
                      ? `Guest: ${guestName}`
                      : 'Reservation guest'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm flex flex-col group">
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        alt="Restaurant ambience"
                        src={ambienceImage}
                      />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary/80 text-on-primary font-label-sm text-label-sm backdrop-blur-md">
                        Atmosphere
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        Your selected dining
                        setting
                      </h4>

                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Table{' '}
                        {tableNumber(actualTable)} is
                        attached to this reservation
                        and will be visible to
                        restaurant staff.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm flex flex-col group">
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        alt="Traditional Ethiopian coffee ceremony"
                        src={coffeeImage}
                      />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm">
                        Your Experience
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        Personalized requests
                      </h4>

                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {requests.selected_addons
                          ?.length
                          ? requests.selected_addons.join(
                              ' • '
                            )
                          : 'No additional experience was selected.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm flex flex-col group">
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        alt="Ethiopian feast"
                        src={feastImage}
                      />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm">
                        Dining Needs
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        Dietary & guest notes
                      </h4>

                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {requests.dietary?.length
                          ? requests.dietary.join(
                              ', '
                            )
                          : 'No dietary notes were supplied.'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="w-full max-w-4xl mt-12 p-6 rounded-xl bg-surface-container-low shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-1/2 h-52 rounded-lg overflow-hidden relative shadow-inner">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${locationImage}")`,
                      }}
                    />

                    <a
                      className="absolute bottom-3 left-3 px-3 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm flex items-center gap-1.5 shadow"
                      href={mapUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        directions
                      </span>

                      Open Directions
                    </a>
                  </div>

                  <div className="w-full md:w-1/2 space-y-3">
                    <span className="font-label-sm text-label-sm uppercase font-bold text-secondary tracking-wide">
                      Arrival & Concierge Notes
                    </span>

                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                      Arriving at{' '}
                      {actualRestaurant?.city ||
                        'the venue'}
                    </h3>

                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Present your digital pass or
                      reservation PIN{' '}
                      <span className="font-mono font-bold text-primary">
                        {code}
                      </span>{' '}
                      to the host upon entry.
                    </p>

                    <div className="pt-2 flex items-center gap-4">
                      <a
                        className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-1"
                        href={mapUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Open in Google Maps

                        <span className="material-symbols-outlined text-[16px]">
                          north_east
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {toast && (
            <div className="fixed bottom-6 right-6 z-50">
              <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-2xl">
                <span className="material-symbols-outlined text-secondary-container">
                  check_circle
                </span>

                <span className="font-label-md text-label-md">
                  {toast}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full bg-surface-container-low mt-stack-lg">
        <div className="w-full px-container-padding-mobile lg:px-container-padding-desktop py-stack-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-stack-md pb-stack-md">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  alt="DINEET logo"
                  className="h-6 w-auto object-contain"
                  src={logo}
                />

                <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                  DINEET
                </span>
              </div>

              <p className="font-body-md text-body-md text-secondary italic">
                Ethiopian Hospitality Reimagined
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-stack-sm lg:gap-stack-md">
              <button
                type="button"
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                onClick={() => router.push('/')}
              >
                Explore
              </button>

              <button
                type="button"
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                onClick={() =>
                  router.push('/reservations')
                }
              >
                Reservations
              </button>

              <span className="font-label-md text-label-md text-on-surface-variant">
                About
              </span>

              <span className="font-label-md text-label-md text-on-surface-variant">
                Privacy
              </span>

              <span className="font-label-md text-label-md text-on-surface-variant">
                Terms
              </span>
            </nav>
          </div>

          <div className="pt-stack-sm flex flex-col sm:flex-row justify-between items-center gap-stack-sm text-on-surface-variant">
            <span className="font-label-sm text-label-sm">
              © 2026 DINEET Hospitality Technologies.
              All rights reserved.
            </span>

            <span className="font-label-sm text-label-sm text-on-surface-variant/80">
              {actualRestaurant?.city ||
                'Addis Ababa'}
              , Ethiopia
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}