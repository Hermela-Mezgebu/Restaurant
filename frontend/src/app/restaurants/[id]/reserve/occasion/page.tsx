'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getToken, getUser, User } from '@/lib/auth';

interface ProfileUser extends User {
  phone?: string | null;
}

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
}

interface ReservationSelection {
  restaurant_id: number;
  table_id: string;
  table_number?: string;
  table_capacity?: number;
  seating_type?: string;
  zone?: string;
  date: string;
  time: string;
  party_size: number;
}

const occasions = [
  {
    id: 'birthday',
    icon: '🎂',
    label: 'Birthday',
    sub: 'Special Candle & Dessert',
  },
  {
    id: 'anniversary',
    icon: '🥂',
    label: 'Anniversary',
    sub: 'Romantic Setting',
  },
  {
    id: 'date',
    icon: '🕯️',
    label: 'Romantic Date',
    sub: 'Intimate Corner',
  },
  {
    id: 'business',
    icon: '💼',
    label: 'Business',
    sub: 'Discreet & Quiet',
  },
  {
    id: 'family',
    icon: '👨‍👩‍👧',
    label: 'Family Dinner',
    sub: 'Spacious Seating',
  },
  {
    id: 'graduation',
    icon: '🎓',
    label: 'Graduation',
    sub: 'Toast Service',
  },
  {
    id: 'coffee',
    icon: '☕',
    label: 'Jebena Gathering',
    sub: 'Traditional Aromas',
  },
  {
    id: 'casual',
    icon: '🍽️',
    label: 'Casual Dining',
    sub: 'Standard Flow',
  },
];

const image =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA0mfbvnZyMZg7R5nwv5vb-ZvCIHnhZ41bY-rk7SOgxb21hYmFu7m52_cOT55gBs6_EWTlh190PtNpyAAlM6hmu3-ifyal6tnkhCtGpoQizwuB5PXVnuuvRKFLEXlmRR5PA_VzX7LJ2x48pxkJn4V9Esat6WEVT6sA9g_dbD1uQmgAez0fBJRQ9iv-mn0KP6zTCpEYHl83jAqOldnEVMfHru9_6fTJARsETA-gZOT1FDgXIH62BfavT';

export default function OccasionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [user, setUser] =
    useState<ProfileUser | null>(null);

  const [selection, setSelection] =
    useState<ReservationSelection | null>(null);

  const [occasion, setOccasion] =
    useState('birthday');

  const [relation, setRelation] =
    useState('partner');

  const [celebrant, setCelebrant] =
    useState('');

  const [candle, setCandle] =
    useState(true);

  const [notifications, setNotifications] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const date =
    searchParams.get('date') || '';

  const time =
    searchParams.get('time') || '';

  const partySize =
    Math.max(
      1,
      Number(searchParams.get('party_size') || 2),
    );

  const tableId =
    searchParams.get('table_id') || '';

  useEffect(() => {
    if (!getToken()) {
      const redirectPath =
        window.location.pathname +
        window.location.search;

      router.replace(
        `/login?redirect=${encodeURIComponent(
          redirectPath,
        )}`,
      );

      return;
    }

    const load = async () => {
      try {
        const [
          me,
          restaurantResponse,
        ] = await Promise.all([
          apiFetch<{ data: ProfileUser }>(
            '/auth/me',
          ),

          apiFetch<{ data?: Restaurant }>(
            `/restaurants/${restaurantId}`,
          ),
        ]);

        setUser(
          me.data ??
            (getUser() as ProfileUser | null),
        );

        setRestaurant(
          restaurantResponse.data ?? null,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your reservation details.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [restaurantId, router]);

  useEffect(() => {
    if (user) {
      setCelebrant(user.name);
    }
  }, [user]);

  /*
   * Recover the actual table selection made on Step 1.
   */
  useEffect(() => {
    if (!restaurantId || !tableId) {
      return;
    }

    const saved =
      sessionStorage.getItem(
        `reservation_selection_${restaurantId}`,
      );

    if (!saved) {
      return;
    }

    try {
      const parsed =
        JSON.parse(saved) as ReservationSelection;

      if (
        String(parsed.table_id) ===
        String(tableId)
      ) {
        setSelection(parsed);
      }
    } catch {
      // Ignore invalid session data.
    }
  }, [restaurantId, tableId]);

  const selectedOccasion = useMemo(
    () =>
      occasions.find(
        (item) => item.id === occasion,
      ) ?? occasions[0],
    [occasion],
  );

  const dateLabel = date
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(
        new Date(`${date}T00:00:00`),
      )
    : 'Select date';

  const timeLabel = time
    ? (() => {
        const [hours, minutes] =
          time.split(':').map(Number);

        const value = new Date();

        value.setHours(
          hours,
          minutes,
          0,
          0,
        );

        return new Intl.DateTimeFormat(
          'en-US',
          {
            hour: 'numeric',
            minute: '2-digit',
          },
        ).format(value);
      })()
    : 'Select time';

  const goNext = () => {
    if (
      !tableId ||
      !date ||
      !time
    ) {
      setError(
        'Your table, date, and time selection are required.',
      );

      return;
    }

    const payload = {
      occasion,
      occasion_label:
        selectedOccasion.label,

      celebrant_name:
        occasion === 'birthday'
          ? celebrant
          : '',

      celebrant_relation:
        occasion === 'birthday'
          ? relation
          : '',

      birthday_candle:
        occasion === 'birthday'
          ? candle
          : false,

      notification_dispatch:
        notifications,

      guest_name:
        user?.name ?? '',

      guest_email:
        user?.email ?? '',

      guest_phone:
        user?.phone ?? '',

      table_id: tableId,
      restaurant_id: restaurantId,
      date,
      time,
      party_size: partySize,
    };

    sessionStorage.setItem(
      `reservation_customization_${restaurantId}_${tableId}`,
      JSON.stringify(payload),
    );

    const query =
      new URLSearchParams({
        restaurant_id:
          String(restaurantId),

        table_id:
          String(tableId),

        date,

        time,

        party_size:
          String(partySize),
      });

    /*
     * Step 3 remains on the existing /book/requests
     * route so it connects with the next page you
     * already have.
     */
    router.push(
      `/restaurants/${restaurantId}/book/requests?${query.toString()}`,
    );
  };

  const goBack = () => {
    const query =
      new URLSearchParams({
        date,
        time,
        party_size:
          String(partySize),
        table_id:
          String(tableId),
      });

    router.push(
      `/restaurants/${restaurantId}/reserve?${query.toString()}`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary">
        Loading your reservation profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 w-full px-container-padding-mobile lg:px-container-padding-desktop flex items-center justify-between">
          <div className="flex items-center gap-stack-md">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/restaurants/${restaurantId}`,
                )
              }
              className="flex items-center gap-3"
            >
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                DINEET
              </span>
            </button>

            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                location_on
              </span>

              <span className="font-label-sm text-label-sm tracking-wide">
                Addis Ababa
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-stack-sm lg:gap-stack-md">
            <span className="font-label-md text-label-md text-on-surface-variant px-3 py-2">
              Explore
            </span>

            <span className="transition-colors bg-primary-container text-on-primary rounded-full px-4 py-2 font-label-md text-label-md">
              Reservations
            </span>

            <span className="font-label-md text-label-md text-on-surface-variant px-3 py-2">
              Experiences
            </span>

            <span className="font-label-md text-label-md text-on-surface-variant px-3 py-2">
              About
            </span>
          </nav>

          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 right-12 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none -z-10" />

          <div className="absolute top-80 -left-20 w-80 h-80 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none -z-10" />

          <div className="w-full px-container-padding-mobile lg:px-container-padding-desktop py-stack-md lg:py-stack-lg max-w-7xl mx-auto">
            {/* Progress */}
            <div className="w-full mb-stack-md lg:mb-stack-lg">
              <div className="flex items-center justify-between max-w-4xl mx-auto relative">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-highest -translate-y-1/2 z-0" />

                <div className="absolute top-1/2 left-0 w-[37.5%] h-[2px] bg-primary -translate-y-1/2 z-0" />

                {[
                  'Table',
                  'Occasion',
                  'Requests',
                  'Payment',
                  'Confirm',
                ].map((label, i) => (
                  <div
                    key={label}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-surface ${
                        i === 0
                          ? 'bg-primary text-on-primary'
                          : i === 1
                            ? 'bg-surface-container-lowest text-primary shadow-lg ring-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {i === 0 ? (
                        <span className="material-symbols-outlined text-[18px]">
                          check
                        </span>
                      ) : (
                        <span className="font-label-md text-label-md font-bold">
                          {i + 1}
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-label-sm text-label-sm mt-2 tracking-wider uppercase ${
                        i <= 1
                          ? 'text-primary font-bold'
                          : 'text-on-surface-variant/70'
                      } hidden sm:block`}
                    >
                      {i + 1}. {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-md gap-4 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-secondary" />

                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">
                    Step 2 of 5 • Hospitality Tailoring
                  </span>
                </div>

                <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
                  Personalize Your Dining Occasion
                </h1>

                <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
                  Help{' '}
                  {restaurant?.name ??
                    'the restaurant'}{' '}
                  prepare the table setting and
                  hospitality tailored specifically
                  for your evening.
                </p>
              </div>

              <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low shadow-sm">
                <span className="material-symbols-outlined text-secondary">
                  verified_user
                </span>

                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm font-semibold text-primary">
                    Gursha Guarantee
                  </span>

                  <span className="text-[11px] text-on-surface-variant leading-none">
                    Dedicated host assigned
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
              <div className="lg:col-span-8 space-y-stack-md">
                {/* Occasion */}
                <div className="bg-surface-container-lowest rounded-xl p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">
                          celebration
                        </span>

                        Select Dining Occasion
                      </h2>

                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        Let the culinary team know the spirit of your
                        visit
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                      Required
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {occasions.map((item) => {
                      const active =
                        item.id === occasion;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setOccasion(item.id)
                          }
                          className={`group text-left p-4 rounded-xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-32 ${
                            active
                              ? 'bg-primary text-on-primary shadow-md'
                              : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xl">
                              {item.icon}
                            </span>

                            <span
                              className={`material-symbols-outlined text-[20px] ${
                                active
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            >
                              check_circle
                            </span>
                          </div>

                          <div>
                            <span className="font-label-md text-label-md block font-bold">
                              {item.label}
                            </span>

                            <span
                              className={`font-label-sm text-label-sm block text-[11px] ${
                                active
                                  ? 'opacity-80'
                                  : 'text-on-surface-variant'
                              }`}
                            >
                              {item.sub}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {occasion === 'birthday' && (
                    <div className="mt-6 p-5 rounded-xl bg-surface-container-low transition-all duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          cake
                        </span>

                        <h3 className="font-label-md text-label-md text-primary font-bold">
                          Birthday Personalization Details
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
                            Whose Birthday?
                          </label>

                          <select
                            value={relation}
                            onChange={(event) =>
                              setRelation(
                                event.target.value,
                              )
                            }
                            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="partner">
                              Partner / Spouse
                            </option>

                            <option value="myself">
                              Myself (Booking Guest)
                            </option>

                            <option value="parent">
                              Parent
                            </option>

                            <option value="friend">
                              Close Friend
                            </option>

                            <option value="colleague">
                              Colleague
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">
                            Celebrant&apos;s Name
                          </label>

                          <input
                            value={celebrant}
                            onChange={(event) =>
                              setCelebrant(
                                event.target.value,
                              )
                            }
                            placeholder="Enter full name"
                            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-secondary">
                            local_fire_department
                          </span>

                          <div>
                            <span className="font-label-md text-label-md text-primary font-semibold block">
                              Complimentary Candle & Traditional Dessert Song
                            </span>

                            <span className="font-label-sm text-label-sm text-on-surface-variant block">
                              Request a birthday dessert presentation
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-surface-container-lowest p-1 rounded-full w-fit">
                          <button
                            type="button"
                            onClick={() =>
                              setCandle(true)
                            }
                            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold ${
                              candle
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            Yes
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCandle(false)
                            }
                            className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold ${
                              !candle
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guest contact */}
                <div className="bg-surface-container-lowest rounded-xl p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">
                          person_pin
                        </span>

                        Primary Guest Contact
                      </h2>

                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        Your account details will be used for reservation
                        updates
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-sm mt-6">
                    <div className="sm:col-span-2">
                      <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1 font-semibold">
                        Full Name
                      </label>

                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                          badge
                        </span>

                        <input
                          readOnly
                          value={user?.name ?? ''}
                          className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg pl-11 pr-4 py-3 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                          Phone Number (SMS Confirmation)
                        </label>

                        <span className="text-[11px] text-secondary font-bold">
                          ETH Primary
                        </span>
                      </div>

                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                          call
                        </span>

                        <input
                          readOnly
                          value={
                            user?.phone ?? ''
                          }
                          placeholder="Phone on your account"
                          className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg pl-11 pr-4 py-3 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1 font-semibold">
                        Email Address
                      </label>

                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                          mail
                        </span>

                        <input
                          readOnly
                          value={
                            user?.email ?? ''
                          }
                          className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg pl-11 pr-4 py-3 outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[22px]">
                          notifications_active
                        </span>
                      </div>

                      <div>
                        <span className="font-label-md text-label-md text-primary font-bold block">
                          Instant Dispatch Alerts
                        </span>

                        <span className="font-label-sm text-label-sm text-on-surface-variant block">
                          Keep reservation updates enabled for your booking
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-pressed={notifications}
                      onClick={() =>
                        setNotifications(
                          (value) => !value,
                        )
                      }
                      className={`w-12 h-6 rounded-full relative flex items-center transition-colors px-0.5 shrink-0 ${
                        notifications
                          ? 'bg-primary'
                          : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 bg-on-primary rounded-full shadow-md transition-transform ${
                          notifications
                            ? 'translate-x-6'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Navigation */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-full font-label-md text-label-md font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_back
                    </span>

                    Back to Table Selection
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-on-primary hover:bg-primary-container shadow-md hover:shadow-lg transition-all font-label-md text-label-md font-bold flex items-center justify-center gap-2 group"
                  >
                    Continue to Special Requests

                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl bg-error-container px-4 py-3 text-error flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px]">
                      error
                    </span>

                    <p className="text-sm">
                      {error}
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-md overflow-hidden relative">
                  <div className="flex items-center gap-3 pb-4">
                    <img
                      className="w-14 h-14 rounded-lg object-cover shrink-0 shadow-sm"
                      alt="Restaurant dining atmosphere"
                      src={image}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[14px]">
                          star
                        </span>

                        <span className="font-label-sm text-label-sm font-bold">
                          Restaurant
                        </span>
                      </div>

                      <h3 className="font-headline-sm text-headline-sm text-primary truncate leading-tight">
                        {restaurant?.name ??
                          'Restaurant'}
                      </h3>

                      <span className="font-label-sm text-label-sm text-on-surface-variant block truncate">
                        {restaurant?.address ??
                          restaurant?.city ??
                          'Addis Ababa'}
                      </span>
                    </div>
                  </div>

                  {/* Table summary */}
                  <div className="p-4 rounded-lg bg-surface-container-low mb-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block text-[11px] font-semibold">
                          Selected Dining Area
                        </span>

                        <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            table_restaurant
                          </span>

                          Table {selection?.table_number ??
                            tableId}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm text-[11px] font-bold">
                        Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px] block">
                          Date & Time
                        </span>

                        <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">
                            schedule
                          </span>

                          {dateLabel},{' '}
                          {timeLabel}
                        </span>
                      </div>

                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px] block">
                          Party Size
                        </span>

                        <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">
                            group
                          </span>

                          {partySize} Guests
                        </span>
                      </div>
                    </div>

                    {selection?.zone && (
                      <div className="pt-2 border-t border-surface-container">
                        <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px] block">
                          Atmosphere
                        </span>

                        <span className="font-label-md text-label-md text-primary font-semibold capitalize">
                          {selection.zone ===
                          'mesob'
                            ? 'Private Mesob Lounge'
                            : selection.zone ===
                                'window'
                              ? 'Window View'
                              : selection.zone ===
                                  'terrace'
                                ? 'Terrace & Garden'
                                : 'Main Dining Hall'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Occasion */}
                  <div className="space-y-2.5 pb-4">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant block text-[11px] font-bold">
                      Selected Hospitality Setting
                    </span>

                    <div className="flex items-center justify-between text-on-surface bg-surface-container-lowest p-2.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {
                            selectedOccasion.icon
                          }
                        </span>

                        <span className="font-label-md text-label-md font-semibold text-primary">
                          {
                            selectedOccasion.label
                          }
                        </span>
                      </div>

                      <span className="w-2 h-2 rounded-full bg-secondary" />
                    </div>

                    {occasion === 'birthday' && (
                      <>
                        <div className="flex items-center justify-between text-on-surface px-2.5 text-[13px]">
                          <span className="text-on-surface-variant">
                            Honoree:
                          </span>

                          <span className="font-semibold text-primary text-right">
                            {celebrant ||
                              user?.name ||
                              'Guest'}{' '}
                            ({relation})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-on-surface px-2.5 text-[13px]">
                          <span className="text-on-surface-variant">
                            Complimentary Candle:
                          </span>

                          <span
                            className={`font-semibold ${
                              candle
                                ? 'text-secondary'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {candle
                              ? 'Yes, Requested'
                              : 'No'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-4 p-4 rounded-xl bg-primary text-on-primary">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-label-sm text-label-sm text-on-primary/80">
                        Reservation Hold
                      </span>

                      <span className="font-headline-sm text-headline-sm text-on-primary font-bold">
                        Live
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-secondary-fixed text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">
                        receipt_long
                      </span>

                      <span>
                        Payment is handled in the next reservation
                        step
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      lock
                    </span>

                    <span className="font-label-sm text-label-sm text-[12px]">
                      Secure reservation flow
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary">
                      support_agent
                    </span>

                    <div>
                      <span className="font-label-sm text-label-sm font-bold text-primary block">
                        Restaurant Host Desk
                      </span>

                      <span className="text-[12px] text-on-surface-variant block">
                        {restaurant?.phone ??
                          'Contact restaurant for assistance'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container-low mt-stack-lg">
        <div className="w-full px-container-padding-mobile lg:px-container-padding-desktop py-stack-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-stack-md pb-stack-md">
            <div className="space-y-2">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                DINEET
              </span>

              <p className="font-body-md text-body-md text-secondary italic">
                Ethiopian Hospitality Reimagined
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-stack-sm lg:gap-stack-md">
              <span className="font-label-md text-label-md text-on-surface-variant">
                About
              </span>

              <span className="font-label-md text-label-md text-on-surface-variant">
                For Restaurants
              </span>

              <span className="font-label-md text-label-md text-on-surface-variant">
                Contact
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
              © 2024 DINEET Hospitality Technologies. All rights
              reserved.
            </span>

            <span className="font-label-sm text-label-sm text-on-surface-variant/80">
              Addis Ababa, Ethiopia
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}