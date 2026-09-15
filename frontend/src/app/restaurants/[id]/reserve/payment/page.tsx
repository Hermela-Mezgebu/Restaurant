'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

interface Table {
  id: number;
  table_number?: string | number | null;
  number?: string | number | null;
  capacity: number;
  seating_type?: string | null;
  zone?: string | null;
  area?: string | null;
  [key: string]: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

interface ReservationCustomization {
  occasion?: string;
  occasion_label?: string;
  celebrant_name?: string;
  celebrant_relation?: string;
  birthday_candle?: boolean;
  notification_dispatch?: boolean;
  sms_updates?: boolean;
  telegram_concierge?: boolean;
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
  payment_method: string;
  payment_phone: string;
  amount: number;
  deposit: number;
  addon_total: number;
  status: 'pending';
  saved_at: string;
}

interface UserProfile {
  phone?: string | null;
  name?: string | null;
  email?: string | null;
}

interface AddonDetail {
  id: string;
  name: string;
  amount: number;
  perGuest: boolean;
}

const addonDetails: Record<
  string,
  {
    name: string;
    price: number;
    perGuest: boolean;
  }
> = {
  buna: {
    name: 'Traditional Ethiopian Buna Ceremony',
    price: 350,
    perGuest: false,
  },

  tej: {
    name: "Chef's Amuse-Bouche & Aged Tej Pairing",
    price: 450,
    perGuest: true,
  },

  floral: {
    name: 'Fresh Highland Floral Centerpiece',
    price: 400,
    perGuest: false,
  },
};

const paymentMethods = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    description: 'Instant QR & USSD push authorization',
    icon: 'contactless',
    popular: true,
  },

  {
    id: 'cbe',
    name: 'CBE Birr',
    description: 'Commercial Bank of Ethiopia mobile payment',
    icon: 'account_balance',
    popular: false,
  },

  {
    id: 'boa',
    name: 'Bank of Abyssinia / Apollo',
    description: 'Mobile banking payment through Apollo',
    icon: 'rocket_launch',
    popular: false,
  },

  {
    id: 'awash',
    name: 'Awash Birr',
    description: 'Direct wallet payment',
    icon: 'account_balance_wallet',
    popular: false,
  },

  {
    id: 'card',
    name: 'Visa / Mastercard',
    description: 'International card payment for guests and diaspora',
    icon: 'credit_card',
    popular: false,
  },

  {
    id: 'points',
    name: 'DINEET Points',
    description: 'Redeem available DINEET points toward the deposit',
    icon: 'stars',
    popular: false,
  },
] as const;

const logo =
  'https://lh3.googleusercontent.com/aida/AEtjO1VmiDA6kGweXDO2uMwdqC1f5e9YN0GTQDKd9-UObpJ06dvmq89ZaNRhRxH3AxctZOAa5kIwjZU-_0tU0f0fMLzewvaEHzU1us2hYmULtN0LFE417dAC6GciXT0MS48A7Icl-7E1gqWGrmf7WeITtFv9E_VMOWOhikyCJ0n6WlrANnFJ22VSlfQnIQfg52HUMokEC7yNsnGUyhkKm-8bB9b8Zecl57kylrakP7q98zPEW5VRXCphSP2AW30';

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = sessionStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Converts stored Ethiopian phone formats into the local
 * 9-digit format displayed next to +251.
 *
 * Examples:
 * +251911234567 -> 911234567
 * 251911234567  -> 911234567
 * 0911234567    -> 911234567
 */
function formatPhoneForDisplay(phone: string): string {
  if (!phone) {
    return '';
  }

  const normalized = phone.trim().replace(/\s+/g, '');

  if (normalized.startsWith('+251')) {
    return normalized.replace(/^\+251\s*/, '');
  }

  if (normalized.startsWith('251')) {
    return normalized.slice(3);
  }

  if (normalized.startsWith('0')) {
    return normalized.slice(1);
  }

  return normalized;
}

/**
 * Converts an Ethiopian phone number into E.164 format.
 *
 * Examples:
 * 0911234567   -> +251911234567
 * 911234567    -> +251911234567
 * 251911234567 -> +251911234567
 */
function normalizePhone(phone: string): string {
  const value = phone.trim().replace(/\s+/g, '');

  if (!value) {
    return '';
  }

  if (value.startsWith('+251')) {
    return value;
  }

  if (value.startsWith('251')) {
    return `+${value}`;
  }

  if (value.startsWith('0')) {
    return `+251${value.slice(1)}`;
  }

  return `+251${value}`;
}

function tableLabel(table: Table | null, tableId: number): string {
  if (!table) {
    return tableId ? `Table ${tableId}` : 'Selected table';
  }

  return `Table ${table.table_number ?? table.number ?? table.id}`;
}

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const tableId = Number(searchParams.get('table_id') || 0);
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  const partySize = Math.max(
    1,
    Number(searchParams.get('party_size') || 2)
  );

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);

  const [customization, setCustomization] =
    useState<ReservationCustomization>({});

  const [requests, setRequests] = useState<ReservationRequests>({});

  const [method, setMethod] = useState('telebirr');

  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);

  const [agreement, setAgreement] = useState(true);

  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');

  const deposit = 500;

  const addonTotal = Number(requests.addon_total || 0);

  const total = deposit + addonTotal;

  const selectedAddons = requests.selected_addons ?? [];

  /**
   * Build a strongly typed list of selected add-ons.
   *
   * Using flatMap() here avoids the TypeScript problem caused by
   * a custom type predicate after filter().
   */
  const selectedAddonDetails = useMemo<AddonDetail[]>(() => {
    return selectedAddons.flatMap((id): AddonDetail[] => {
      const addon = addonDetails[id];

      if (!addon) {
        return [];
      }

      const amount = addon.perGuest
        ? addon.price * partySize
        : addon.price;

      return [
        {
          id,
          name: addon.name,
          amount,
          perGuest: addon.perGuest,
        },
      ];
    });
  }, [selectedAddons, partySize]);

  useEffect(() => {
    if (!getToken()) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`
      );

      return;
    }

    if (!restaurantId || !tableId || !date || !time) {
      setError(
        'Your reservation information is incomplete. Please return to the table selection step.'
      );

      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [restaurantResponse, tablesResponse] =
          await Promise.all([
            apiFetch<ApiResponse<Restaurant>>(
              `/restaurants/${restaurantId}`
            ),

            apiFetch<ApiResponse<Table[]>>(
              `/restaurants/${restaurantId}/tables`
            ),
          ]);

        setRestaurant(restaurantResponse.data ?? null);

        const selectedTable =
          (tablesResponse.data ?? []).find(
            (item) => item.id === tableId
          ) ?? null;

        setTable(selectedTable);

        const savedCustomization =
          readSession<ReservationCustomization>(
            `reservation_customization_${restaurantId}_${tableId}`,
            {}
          );

        const savedRequests =
          readSession<ReservationRequests>(
            `reservation_requests_${restaurantId}_${tableId}`,
            {}
          );

        setCustomization(savedCustomization);
        setRequests(savedRequests);

        const profile = getUser() as UserProfile | null;

        const savedPhone =
          savedCustomization.guest_phone ||
          profile?.phone ||
          '';

        setPhone(formatPhoneForDisplay(savedPhone));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load payment details.'
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [restaurantId, tableId, date, time, router]);

  const backUrl = useMemo(() => {
    const query = new URLSearchParams({
      table_id: String(tableId),
      date,
      time,
      party_size: String(partySize),
    });

    return `/restaurants/${restaurantId}/book/requests?${query.toString()}`;
  }, [
    restaurantId,
    tableId,
    date,
    time,
    partySize,
  ]);

  const confirmationUrl = useMemo(() => {
    const query = new URLSearchParams({
      table_id: String(tableId),
      date,
      time,
      party_size: String(partySize),
    });

    return `/restaurants/${restaurantId}/book/confirm?${query.toString()}`;
  }, [
    restaurantId,
    tableId,
    date,
    time,
    partySize,
  ]);

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find(
      (item) => item.id === method
    );
  }, [method]);

  const savePaymentAndContinue = () => {
    setError('');

    if (!agreement) {
      setError(
        'Please review and accept the reservation policies to continue.'
      );
      return;
    }

    if (!method) {
      setError('Please select a payment method.');
      return;
    }

    if (method === 'telebirr') {
      const normalizedPhone = normalizePhone(phone);

      if (
        !normalizedPhone ||
        !/^\+2519\d{8}$/.test(normalizedPhone)
      ) {
        setError(
          'Please enter a valid Ethiopian mobile number for Telebirr.'
        );
        return;
      }
    }

    setContinuing(true);

    try {
      const normalizedPaymentPhone = phone
        ? normalizePhone(phone)
        : '';

      const payment: ReservationPayment = {
        payment_method: method,

        payment_phone:
          method === 'telebirr'
            ? normalizedPaymentPhone
            : normalizedPaymentPhone,

        amount: total,

        deposit,

        addon_total: addonTotal,

        status: 'pending',

        saved_at: new Date().toISOString(),
      };

      sessionStorage.setItem(
        `reservation_payment_${restaurantId}_${tableId}`,
        JSON.stringify(payment)
      );

      /*
       * IMPORTANT:
       *
       * The current Laravel backend exposes reservation creation,
       * but it does not expose a real payment-provider endpoint.
       *
       * Therefore this page intentionally does NOT claim that
       * Telebirr, CBE Birr, Apollo, Awash, Visa/Mastercard, or
       * DINEET Points payment has actually succeeded.
       *
       * The selected payment method is stored as "pending".
       *
       * The final confirmation page is responsible for creating
       * the actual reservation through POST /reservations.
       */

      router.push(confirmationUrl);
    } catch {
      setError(
        'Unable to save your payment selection. Please try again.'
      );

      setContinuing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-body-md text-on-surface-variant">
        Loading secure payment workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 w-full px-container-padding-mobile lg:px-container-padding-desktop flex items-center justify-between">
          <a
            className="flex items-center gap-3 group"
            href={`/restaurants/${restaurantId}`}
          >
            <img
              alt="DINEET logo"
              className="h-8 w-auto object-contain"
              src={logo}
            />

            <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
              DINEET
            </span>
          </a>

          <div className="flex items-center gap-stack-sm">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                location_on
              </span>

              <span className="font-label-sm text-label-sm tracking-wide">
                Addis Ababa
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

      {/* MAIN */}
      <main className="w-full pt-20 bg-surface min-h-screen">
        {/* PROGRESS BAR */}
        <div className="w-full bg-surface-container-low px-container-padding-mobile lg:px-container-padding-desktop py-stack-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />

              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">
                Reservation in progress
              </span>
            </div>

            <nav
              aria-label="Booking steps"
              className="w-full md:w-auto"
            >
              <ol className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
                {[
                  ['check', 'Table', false],
                  ['check', 'Occasion', false],
                  ['check', 'Requests', false],
                  ['4', 'Deposit', true],
                  ['5', 'Confirm', false],
                ].map(([icon, label, active], index) => (
                  <li
                    key={String(label)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
                        index < 3
                          ? 'bg-primary text-on-primary'
                          : active
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {icon === 'check' ? (
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                      ) : (
                        <span className="font-label-sm text-label-sm">
                          {icon}
                        </span>
                      )}
                    </span>

                    <span
                      className={`font-label-md text-label-md hidden lg:inline ${
                        active
                          ? 'text-primary font-bold'
                          : index < 3
                            ? 'text-primary'
                            : 'text-on-surface-variant'
                      }`}
                    >
                      {label}
                    </span>

                    {index < 4 && (
                      <span
                        className={`w-4 h-0.5 hidden sm:inline-block ${
                          index < 3
                            ? 'bg-primary'
                            : 'bg-outline-variant'
                        }`}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        {/* CONTENT */}
        <div className="w-full px-container-padding-mobile lg:px-container-padding-desktop py-stack-lg max-w-7xl mx-auto">
          {/* PAGE TITLE */}
          <div className="mb-stack-lg">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">
                {restaurant?.name ?? 'Restaurant'}
              </span>

              <span className="text-outline-variant">
                •
              </span>

              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {tableLabel(table, tableId)}
              </span>

              <span className="text-outline-variant">
                •
              </span>

              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {partySize}{' '}
                {partySize === 1 ? 'guest' : 'guests'}
              </span>
            </div>

            <h1 className="font-headline-md text-headline-md lg:font-display-lg lg:text-display-lg text-primary tracking-tight">
              Deposit &amp; Local Payment
            </h1>

            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-3xl">
              Choose how you plan to pay the reservation
              deposit and selected experiences. Your choice
              is saved for the final confirmation step.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-lg bg-error-container text-on-error-container px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px]">
                error
              </span>

              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT */}
            <section className="lg:col-span-7 flex flex-col gap-stack-md">
              {/* PAYMENT METHODS */}
              <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        payments
                      </span>

                      <h2 className="font-headline-sm text-headline-sm text-primary">
                        Choose Your Payment Method
                      </h2>
                    </div>

                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      Ethiopia-first payment options for your
                      reservation deposit.
                    </p>
                  </div>

                  <span className="font-label-sm text-label-sm text-primary bg-primary-container px-3 py-1.5 rounded-full whitespace-nowrap">
                    Step 4 of 5
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {paymentMethods.map((item) => {
                    const selected = method === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMethod(item.id)}
                        className={`w-full text-left relative flex items-center justify-between p-4 rounded-xl transition-all duration-200 border ${
                          selected
                            ? 'bg-surface-container-low border-primary shadow-sm'
                            : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-11 h-11 rounded-lg flex items-center justify-center shadow-sm ${
                              item.id === 'points'
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : selected
                                  ? 'bg-primary-container text-on-primary'
                                  : 'bg-surface-container-highest text-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">
                              {item.icon}
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-label-md text-label-md text-primary font-bold">
                                {item.name}
                              </span>

                              {item.popular && (
                                <span className="bg-secondary text-on-secondary px-2 py-0.5 rounded-full font-label-sm text-[10px] tracking-wide uppercase font-bold">
                                  Popular
                                </span>
                              )}
                            </div>

                            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selected
                              ? 'border-primary'
                              : 'border-outline-variant'
                          }`}
                        >
                          {selected && (
                            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* TELEBIRR */}
                {method === 'telebirr' && (
                  <div className="mt-6 p-5 bg-surface-container-low rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-outline-variant/40">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        Telebirr Mobile Number
                      </span>

                      <span className="font-label-sm text-label-sm text-primary flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-[16px]">
                          verified
                        </span>

                        Provider-ready
                      </span>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="telebirr_phone"
                        className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant block mb-2"
                      >
                        Registered Telebirr Mobile
                      </label>

                      <div className="flex items-center rounded-lg bg-surface-container-lowest px-4 py-3 shadow-inner">
                        <span className="font-label-md text-label-md text-primary font-bold mr-2">
                          +251
                        </span>

                        <input
                          id="telebirr_phone"
                          type="tel"
                          value={formatPhoneForDisplay(phone)}
                          onChange={(event) =>
                            setPhone(
                              event.target.value.replace(
                                /[^\d\s]/g,
                                ''
                              )
                            )
                          }
                          disabled={!editingPhone}
                          placeholder="91 123 4567"
                          className="bg-transparent font-label-md text-label-md text-on-surface w-full focus:outline-none tracking-wide"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setEditingPhone((value) => !value)
                          }
                          className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors font-semibold ml-2"
                        >
                          {editingPhone ? 'Save' : 'Edit'}
                        </button>
                      </div>

                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
                        We will use this number when the
                        Telebirr gateway is connected.
                      </p>
                    </div>

                    <div className="mt-5 flex items-start gap-3 p-4 rounded-lg bg-surface-container">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                        info
                      </span>

                      <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                        Live Telebirr authorization is not
                        simulated. Your selected payment method
                        is saved as pending until the real
                        payment gateway is connected.
                      </p>
                    </div>
                  </div>
                )}

                {/* DINEET POINTS */}
                {method === 'points' && (
                  <div className="mt-6 p-5 bg-surface-container-low rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        stars
                      </span>

                      <div>
                        <h3 className="font-label-md text-label-md text-primary font-bold">
                          DINEET Points
                        </h3>

                        <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                          DINEET Points can be used toward the
                          reservation deposit when the points
                          service is connected. The current
                          application does not yet verify or
                          deduct a points balance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* OTHER PAYMENT METHODS */}
                {method !== 'telebirr' &&
                  method !== 'points' && (
                    <div className="mt-6 p-5 bg-surface-container-low rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          info
                        </span>

                        <div>
                          <h3 className="font-label-md text-label-md text-primary font-bold">
                            {selectedPaymentMethod?.name ??
                              'Payment method'}
                          </h3>

                          <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                            This payment option is ready for
                            provider integration. The current
                            application records your
                            selection but does not generate a
                            fake successful payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* SECURITY */}
                <div className="mt-6 pt-5 border-t border-outline-variant/40">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-on-surface-variant font-label-sm text-[12px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        lock
                      </span>

                      Secure booking
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">
                        verified_user
                      </span>

                      Deposit protected
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        location_on
                      </span>

                      Addis Ababa
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT POLICY */}
              <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">
                    policy
                  </span>

                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Deposit Policy
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">
                      check_circle
                    </span>

                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Your {deposit.toLocaleString()} ETB
                      reservation deposit is recorded against
                      this booking.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">
                      check_circle
                    </span>

                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Selected experience add-ons are included
                      in today&apos;s payable amount.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">
                      check_circle
                    </span>

                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Final payment authorization will be
                      handled by the configured payment
                      provider.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">
                      schedule
                    </span>

                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Please review the restaurant&apos;s
                      cancellation policy before completing
                      your reservation.
                    </p>
                  </div>
                </div>
              </div>

              {/* MOBILE NAVIGATION */}
              <div className="lg:hidden flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.push(backUrl)}
                  className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>

                  Back to Requests
                </button>

                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Step 4 of 5
                </span>
              </div>
            </section>

            {/* RIGHT SUMMARY */}
            <aside className="lg:col-span-5 flex flex-col gap-stack-md lg:sticky lg:top-28">
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-md">
                {/* RESTAURANT */}
                <div className="flex items-center gap-4 pb-5 border-b border-outline-variant/40">
                  <div className="w-16 h-16 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-3xl">
                      restaurant
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                      Booking Summary
                    </span>

                    <h3 className="font-headline-sm text-headline-sm text-primary truncate">
                      {restaurant?.name ?? 'Restaurant'}
                    </h3>

                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {[
                        restaurant?.address,
                        restaurant?.city,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Addis Ababa'}
                    </p>
                  </div>
                </div>

                {/* RESERVATION DETAILS */}
                <div className="py-5 space-y-3 border-b border-outline-variant/40">
                  <div className="flex justify-between gap-4">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Table
                    </span>

                    <span className="font-label-md text-label-md text-primary font-semibold text-right">
                      {tableLabel(table, tableId)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Guests
                    </span>

                    <span className="font-label-md text-label-md text-primary font-semibold">
                      {partySize}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Date
                    </span>

                    <span className="font-label-md text-label-md text-primary font-semibold">
                      {date}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Time
                    </span>

                    <span className="font-label-md text-label-md text-primary font-semibold">
                      {time}
                    </span>
                  </div>

                  {customization.occasion_label && (
                    <div className="flex justify-between gap-4">
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        Occasion
                      </span>

                      <span className="font-label-md text-label-md text-secondary font-semibold text-right">
                        {customization.occasion_label}
                      </span>
                    </div>
                  )}
                </div>

                {/* ADD-ONS */}
                <div className="py-5 border-b border-outline-variant/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant/70">
                      Selected Experiences
                    </span>

                    <span className="font-label-sm text-label-sm text-secondary">
                      {selectedAddonDetails.length}
                    </span>
                  </div>

                  {selectedAddonDetails.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAddonDetails.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[17px] text-secondary mt-0.5">
                              local_cafe
                            </span>

                            <div>
                              <span className="font-body-md text-body-md text-on-surface-variant">
                                {addon.name}
                              </span>

                              {addon.perGuest && (
                                <span className="block font-label-sm text-[11px] text-on-surface-variant/70">
                                  {partySize} guests
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                            +
                            {addon.amount.toLocaleString()}
                            {' ETB'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      No additional experiences selected.
                    </p>
                  )}
                </div>

                {/* PRICE BREAKDOWN */}
                <div className="py-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Reservation Deposit
                    </span>

                    <span className="font-label-md text-label-md text-primary">
                      {deposit.toLocaleString()} ETB
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Experience Add-ons
                    </span>

                    <span className="font-label-md text-label-md text-primary">
                      {addonTotal > 0
                        ? `+${addonTotal.toLocaleString()} ETB`
                        : '0 ETB'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      DINEET Concierge Fee
                    </span>

                    <span className="font-label-sm text-label-sm uppercase tracking-wide text-primary font-bold">
                      Waived
                    </span>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="p-5 rounded-xl bg-surface-container-low">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="font-headline-sm text-[20px] text-primary font-bold">
                      Payable Today
                    </span>

                    <div className="text-right">
                      <span className="font-headline-md text-headline-md text-primary font-bold">
                        {total.toLocaleString()}
                      </span>

                      <span className="font-label-md text-label-md text-primary font-bold ml-1">
                        ETB
                      </span>
                    </div>
                  </div>

                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
                    {deposit.toLocaleString()} ETB deposit
                    {addonTotal > 0
                      ? ` + ${addonTotal.toLocaleString()} ETB selected experiences`
                      : ''}
                    .
                  </p>

                  {selectedAddons.includes('buna') && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary-container px-3 py-2">
                      <span className="material-symbols-outlined text-[17px] text-on-secondary-container">
                        local_cafe
                      </span>

                      <p className="font-label-sm text-[11px] text-on-secondary-container leading-relaxed">
                        The 350 ETB Buna ceremony is credited
                        to the dinner check according to the
                        reservation experience.
                      </p>
                    </div>
                  )}
                </div>

                {/* AGREEMENT */}
                <div className="mt-5">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      checked={agreement}
                      onChange={(event) =>
                        setAgreement(event.target.checked)
                      }
                      className="w-5 h-5 mt-0.5 accent-primary cursor-pointer rounded"
                      type="checkbox"
                    />

                    <span className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
                      I agree to the restaurant reservation
                      policies and DINEET terms of service.
                    </span>
                  </label>
                </div>

                {/* CONTINUE */}
                <div className="mt-5">
                  <button
                    disabled={!agreement || continuing}
                    onClick={savePaymentAndContinue}
                    className="w-full bg-primary text-on-primary py-4 px-6 rounded-xl font-label-md text-label-md tracking-wide flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:bg-primary-container disabled:opacity-60 transition-all"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      lock
                    </span>

                    <span>
                      {continuing
                        ? 'Saving payment selection…'
                        : 'Continue to Confirmation'}
                    </span>

                    {!continuing && (
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    )}
                  </button>

                  <p className="text-center font-label-sm text-[11px] text-on-surface-variant mt-2 leading-relaxed">
                    Your payment method is saved as pending.
                    Real gateway authorization must be connected
                    before money is collected.
                  </p>
                </div>

                {/* BACK */}
                <button
                  type="button"
                  onClick={() => router.push(backUrl)}
                  className="w-full mt-3 py-2.5 px-4 text-center font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_back
                  </span>

                  <span>Back to Requests</span>
                </button>

                {/* TRUST */}
                <div className="mt-5 pt-5 border-t border-outline-variant/40 flex items-center justify-around text-center text-on-surface-variant/80">
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-secondary">
                      workspace_premium
                    </span>

                    <span className="font-label-sm text-[11px] mt-1">
                      DINEET Verified
                    </span>
                  </div>

                  <div className="w-px h-6 bg-surface-container-high" />

                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      security
                    </span>

                    <span className="font-label-sm text-[11px] mt-1">
                      Secure Booking
                    </span>
                  </div>

                  <div className="w-px h-6 bg-surface-container-high" />

                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-tertiary">
                      dinner_dining
                    </span>

                    <span className="font-label-sm text-[11px] mt-1">
                      Direct Restaurant
                    </span>
                  </div>
                </div>
              </div>

              {/* HELP CARD */}
              <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary p-6 shadow-md">
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary-container uppercase tracking-wider font-bold">
                      Ethiopian Hospitality
                    </span>

                    <span className="material-symbols-outlined text-secondary-container">
                      restaurant
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-inverse-on-surface leading-relaxed">
                    Your table, occasion, guest details, dietary
                    notes, add-ons and payment preference remain
                    connected through the final confirmation
                    step.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-[12px]">
                      D
                    </div>

                    <div>
                      <div className="font-label-md text-label-md text-on-primary">
                        {restaurant?.name ?? 'Restaurant'} Team
                      </div>

                      <div className="font-label-sm text-label-sm text-on-primary-container">
                        DINEET Reservation Concierge
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUPPORT */}
              {restaurant?.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="p-4 rounded-lg bg-surface-container-low flex items-start gap-3 hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    support_agent
                  </span>

                  <div>
                    <h4 className="font-label-md text-label-md text-primary">
                      Need assistance?
                    </h4>

                    <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-0.5">
                      Call {restaurant.phone}
                    </p>
                  </div>
                </a>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* FOOTER */}
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
              <a
                className="font-label-md text-label-md text-on-surface-variant"
                href="#"
              >
                About
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant"
                href="#"
              >
                For Restaurants
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant"
                href="#"
              >
                Contact
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant"
                href="#"
              >
                Privacy
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant"
                href="#"
              >
                Terms
              </a>
            </nav>
          </div>

          <div className="pt-stack-sm flex flex-col sm:flex-row justify-between items-center gap-stack-sm text-on-surface-variant">
            <span className="font-label-sm text-label-sm">
              © 2024 DINEET Hospitality Technologies. All rights
              reserved.
            </span>

            <span className="font-label-sm text-label-sm">
              Addis Ababa, Ethiopia
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}