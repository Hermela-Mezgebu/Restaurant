'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
}

interface AvailabilitySlot {
  time?: string;
  reservation_time?: string;
  available?: boolean;
  table_id?: number | string;
  id?: number | string;
  table_number?: number | string;
  capacity?: number;
  seating_type?: string;
  zone?: string;
  area?: string;
  table?: {
    id?: number | string;
    table_number?: number | string;
    capacity?: number;
    seating_type?: string;
    status?: string;
    zone?: string;
    area?: string;
  };
}

interface AvailabilityResponse {
  data?:
    | {
        slots?: AvailabilitySlot[];
        tables?: AvailabilitySlot[];
      }
    | AvailabilitySlot[];
  slots?: AvailabilitySlot[];
  tables?: AvailabilitySlot[];
}

interface DiningTable {
  id: string;
  tableNumber: string;
  capacity: number;
  seatingType: string;
  zone: 'window' | 'terrace' | 'mesob' | 'main';
  available: boolean;
}

type ZoneId = 'all' | 'window' | 'terrace' | 'mesob' | 'main';

const restaurantImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA0mfbvnZyMZg7R5nwv5vb-ZvCIHnhZ41bY-rk7SOgxb21hYmFu7m52_cOT55gBs6_EWTlh190PtNpyAAlM6hmu3-ifyal6tnkhCtGpoQizwuB5PXVnuuvRKFLEXlmRR5PA_VzX7LJ2x48pxkJn4V9Esat6WEVT6sA9g_dbD1uQmgAez0fBJRQ9iv-mn0KP6zTCpEYHl83jAqOldnEVMfHru9_6fTJARsETA-gZOT1FDgXIH62BfavT';

const tableImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDuHVzXFOzrjn3bvofdAEXm49VMu4jLYDehuFFE0EIwl6Zrng2SuT94Wz1TbDjzS3h4Ke_y4-USYiMM6wsPLZagrGE2s3ZB0u6wV64bk0TB9q42EUkiioirs3VHdGhHbdphmRRlqMRrtgrfmmlE0mgSObARg0xx9ibExgvQSGSa4xzSgwWBdW_8ZENS_GGUrAleWtquRIu05j4eQZlSnB9C8NCIUkR-8uIh8S3nHne2VFXBWUUQR-YM';

const zones: Array<{
  id: ZoneId;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'all',
    label: 'All Atmospheres',
    icon: 'restaurant',
    description: 'Explore every available seating atmosphere.',
  },
  {
    id: 'window',
    label: 'Window View Booths',
    icon: 'window',
    description: 'Panoramic views and intimate booth seating.',
  },
  {
    id: 'terrace',
    label: 'Terrace & Garden',
    icon: 'nature_people',
    description: 'Open-air dining surrounded by greenery.',
  },
  {
    id: 'mesob',
    label: 'Private Mesob Lounge',
    icon: 'room_service',
    description: 'Warm private seating for traditional gatherings.',
  },
  {
    id: 'main',
    label: 'Main Dining Hall',
    icon: 'table_restaurant',
    description: 'Classic restaurant seating and easy access.',
  },
];

function normalizeTime(value?: string) {
  if (!value) return '';
  return value.slice(0, 5);
}

function getZone(
  seatingType?: string,
  zone?: string,
  area?: string,
  tableId?: string,
): DiningTable['zone'] {
  const value = `${seatingType ?? ''} ${zone ?? ''} ${area ?? ''}`.toLowerCase();

  if (
    value.includes('window') ||
    value.includes('booth') ||
    value.includes('panorama')
  ) {
    return 'window';
  }

  if (
    value.includes('terrace') ||
    value.includes('garden') ||
    value.includes('outdoor') ||
    value.includes('veranda')
  ) {
    return 'terrace';
  }

  if (
    value.includes('mesob') ||
    value.includes('lounge') ||
    value.includes('private') ||
    value.includes('vip')
  ) {
    return 'mesob';
  }

  /*
   * Your current RestaurantTable API may only expose:
   * table_number, capacity, seating_type and status.
   *
   * When no zone is supplied by the backend, we use a visual fallback
   * only so the floor plan can still be grouped into the requested
   * DINEET atmospheres.
   *
   * This does NOT change the actual table_id sent to Laravel.
   */
  const numericId = Number(tableId ?? 0);

  if (!Number.isNaN(numericId) && numericId > 0) {
    const remainder = numericId % 3;

    if (remainder === 1) return 'window';
    if (remainder === 2) return 'terrace';
  }

  return 'main';
}

function getTableIcon(zone: DiningTable['zone']) {
  if (zone === 'window') return 'window';
  if (zone === 'terrace') return 'nature_people';
  if (zone === 'mesob') return 'room_service';
  return 'table_restaurant';
}

function getZoneName(zone: DiningTable['zone']) {
  switch (zone) {
    case 'window':
      return 'Window View';
    case 'terrace':
      return 'Terrace';
    case 'mesob':
      return 'Mesob';
    default:
      return 'Main Hall';
  }
}

function getTableDescription(table: DiningTable) {
  switch (table.zone) {
    case 'window':
      return 'A refined window-side setting with a panoramic atmosphere, ideal for intimate dinners and celebrations.';

    case 'terrace':
      return 'An open-air garden atmosphere with fresh air, greenery and a relaxed Addis evening experience.';

    case 'mesob':
      return 'A warm Ethiopian-inspired private setting suited to gatherings, coffee ceremonies and shared dining.';

    default:
      return 'Comfortable central dining placement with convenient access to the restaurant experience.';
  }
}

function getSeatingLabel(table: DiningTable) {
  if (!table.seatingType || table.seatingType === 'standard') {
    switch (table.zone) {
      case 'window':
        return 'Window booth';
      case 'terrace':
        return 'Outdoor table';
      case 'mesob':
        return 'Mesob lounge';
      default:
        return 'Standard dining';
    }
  }

  return table.seatingType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ReservePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const partySize = Math.max(
    1,
    Number(searchParams.get('party_size') || 2),
  );

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [activeZone, setActiveZone] = useState<ZoneId>('all');

  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      const redirectPath =
        window.location.pathname + window.location.search;

      router.replace(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
      );

      return;
    }

    if (!restaurantId) {
      setError('Invalid restaurant.');
      setLoading(false);
      return;
    }

    const loadRestaurant = async () => {
      try {
        const response = await apiFetch<{ data?: Restaurant }>(
          `/restaurants/${restaurantId}`,
        );

        setRestaurant(response.data ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load the restaurant.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadRestaurant();
  }, [restaurantId, router]);

  useEffect(() => {
    if (!restaurantId || !date || !time) {
      setAvailabilityLoading(false);

      if (!date || !time) {
        setError(
          'Please choose a reservation date and time before selecting a table.',
        );
      }

      return;
    }

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setError('');

      try {
        const query = new URLSearchParams({
          date,
          party_size: String(partySize),
          time,
        });

        const response = await apiFetch<AvailabilityResponse>(
          `/restaurants/${restaurantId}/availability?${query.toString()}`,
        );

        const responseData = response.data;

        let rawSlots: AvailabilitySlot[] = [];

        if (Array.isArray(responseData)) {
          rawSlots = responseData;
        } else if (responseData?.slots) {
          rawSlots = responseData.slots;
        } else if (responseData?.tables) {
          rawSlots = responseData.tables;
        } else if (response.slots) {
          rawSlots = response.slots;
        } else if (response.tables) {
          rawSlots = response.tables;
        }

        const requestedTime = normalizeTime(time);

        const filteredSlots = rawSlots.filter((slot) => {
          const slotTime = normalizeTime(
            slot.reservation_time ?? slot.time,
          );

          if (!slotTime) return true;

          return slotTime === requestedTime;
        });

        const mapped = filteredSlots
          .map<DiningTable | null>((slot) => {
            const nestedTable = slot.table;

            const rawId =
              nestedTable?.id ??
              slot.table_id ??
              slot.id;

            if (rawId === undefined || rawId === null) {
              return null;
            }

            const id = String(rawId);

            const tableNumber = String(
              nestedTable?.table_number ??
                slot.table_number ??
                rawId,
            );

            const capacity = Number(
              nestedTable?.capacity ??
                slot.capacity ??
                partySize,
            );

            const seatingType =
              nestedTable?.seating_type ??
              slot.seating_type ??
              'standard';

            const zone = getZone(
              nestedTable?.seating_type ??
                slot.seating_type,
              nestedTable?.zone ?? slot.zone,
              nestedTable?.area ?? slot.area,
              id,
            );

            return {
              id,
              tableNumber,
              capacity,
              seatingType,
              zone,
              available: slot.available !== false,
            };
          })
          .filter((table): table is DiningTable => table !== null)
          .filter((table) => table.capacity >= partySize)
          .filter(
            (table, index, all) =>
              all.findIndex((item) => item.id === table.id) === index,
          );

        setTables(mapped);

        const existingSelection = sessionStorage.getItem(
          `reservation_selection_${restaurantId}`,
        );

        if (existingSelection) {
          try {
            const saved = JSON.parse(existingSelection);

            const savedTable = mapped.find(
              (table) => table.id === String(saved.table_id),
            );

            if (savedTable?.available) {
              setSelectedTableId(savedTable.id);
              return;
            }
          } catch {
            // Ignore invalid session data.
          }
        }

        const firstAvailable = mapped.find(
          (table) => table.available,
        );

        if (firstAvailable) {
          setSelectedTableId(firstAvailable.id);
        } else {
          setSelectedTableId('');
        }
      } catch (err) {
        setTables([]);
        setSelectedTableId('');

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load live table availability.',
        );
      } finally {
        setAvailabilityLoading(false);
      }
    };

    void loadAvailability();
  }, [restaurantId, date, time, partySize]);

  const selectedTable = useMemo(
    () =>
      tables.find((table) => table.id === selectedTableId) ??
      null,
    [tables, selectedTableId],
  );

  const visibleTables = useMemo(() => {
    if (activeZone === 'all') {
      return tables;
    }

    return tables.filter((table) => table.zone === activeZone);
  }, [activeZone, tables]);

  const dateLabel = date
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date(`${date}T00:00:00`))
    : 'Select date';

  const timeLabel = time
    ? (() => {
        const [hours, minutes] = time.split(':').map(Number);

        const value = new Date();
        value.setHours(hours, minutes, 0, 0);

        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }).format(value);
      })()
    : 'Select time';

  const selectTable = (table: DiningTable) => {
    if (!table.available) return;

    setSelectedTableId(table.id);
    setError('');
  };

  const continueToOccasion = () => {
    if (!date || !time) {
      setError(
        'Your reservation date and time are required.',
      );
      return;
    }

    if (!selectedTable) {
      setError('Please select an available table to continue.');
      return;
    }

    const selection = {
      restaurant_id: restaurantId,
      table_id: selectedTable.id,
      table_number: selectedTable.tableNumber,
      table_capacity: selectedTable.capacity,
      seating_type: selectedTable.seatingType,
      zone: selectedTable.zone,
      date,
      time,
      party_size: partySize,
    };

    sessionStorage.setItem(
      `reservation_selection_${restaurantId}`,
      JSON.stringify(selection),
    );

    const query = new URLSearchParams({
      restaurant_id: String(restaurantId),
      table_id: selectedTable.id,
      date,
      time,
      party_size: String(partySize),
    });

    router.push(
      `/restaurants/${restaurantId}/reserve/occasion?${query.toString()}`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary">
        Loading your reservation experience…
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
                router.push(`/restaurants/${restaurantId}`)
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
        <div className="flex flex-col w-full">
          {/* Reservation context bar */}
          <div className="w-full bg-surface-container-lowest shadow-sm py-4 px-container-padding-mobile lg:px-container-padding-desktop flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />

              <span className="font-headline-sm text-headline-sm text-primary">
                {restaurant?.name ?? 'Restaurant'}
              </span>

              <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                {restaurant?.address ??
                  restaurant?.city ??
                  'Addis Ababa'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-surface-container-low px-4 py-2 rounded-full text-on-surface">
              <div className="flex items-center gap-1.5 font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  calendar_today
                </span>
                <span>{dateLabel}</span>
              </div>

              <span className="text-outline-variant">•</span>

              <div className="flex items-center gap-1.5 font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  schedule
                </span>
                <span>{timeLabel}</span>
              </div>

              <span className="text-outline-variant">•</span>

              <div className="flex items-center gap-1.5 font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  group
                </span>
                <span>{partySize} Guests</span>
              </div>

              <span className="text-outline-variant">•</span>

              <div className="flex items-center gap-1.5 font-label-md text-label-md text-primary font-semibold">
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  payments
                </span>
                <span>500 ETB Deposit</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-7xl mx-auto px-container-padding-mobile lg:px-container-padding-desktop py-8">
            {/* Progress */}
            <div className="mb-10">
              <div className="flex items-center justify-between relative max-w-4xl mx-auto">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container -translate-y-1/2 z-0" />

                <div className="absolute top-1/2 left-0 w-[12.5%] h-[2px] bg-primary -translate-y-1/2 transition-all duration-500" />

                {[
                  'Table & Seating',
                  'Guest & Occasion',
                  'Special Requests',
                  'Deposit',
                  'Confirmed',
                ].map((label, index) => (
                  <div
                    key={label}
                    className="relative z-10 flex flex-col items-center gap-2"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md ring-4 ring-surface ${
                        index === 0
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <span
                      className={`font-label-md text-label-md tracking-tight ${
                        index === 0
                          ? 'text-primary font-bold'
                          : 'text-on-surface-variant hidden sm:inline'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest block mb-1">
                      Step 01 • Curated Placement
                    </span>

                    <h1 className="font-headline-md text-headline-md text-primary">
                      Choose Your Seating Atmosphere
                    </h1>

                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
                      Select an available table that matches the
                      atmosphere you want for your evening.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-full">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Available
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Reserved
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-surface-dim" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Occupied
                      </span>
                    </div>
                  </div>
                </div>

                {/* Zones */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {zones.map((zone) => {
                    const active = activeZone === zone.id;

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setActiveZone(zone.id)}
                        className={`px-5 py-2.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-all flex items-center gap-2 ${
                          active
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {zone.icon}
                        </span>

                        {zone.label}
                      </button>
                    );
                  })}
                </div>

                {/* Floor plan */}
                <div className="relative bg-surface-container-lowest rounded-xl shadow-md p-6 overflow-hidden min-h-[440px] flex flex-col">
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                      backgroundImage:
                        'radial-gradient(#01261f 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  <div className="flex items-center justify-between text-on-surface-variant relative z-10 pb-4 border-b border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        grid_goldenratio
                      </span>

                      <span className="font-label-sm text-label-sm tracking-wider uppercase">
                        {restaurant?.name ?? 'Restaurant'} Floor Plan
                      </span>
                    </div>

                    <span className="font-label-sm text-label-sm italic text-secondary">
                      Live Availability
                    </span>
                  </div>

                  {availabilityLoading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[320px]">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />

                        <p className="font-label-md text-label-md text-primary font-semibold">
                          Checking available tables…
                        </p>

                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                          Synchronizing with the restaurant.
                        </p>
                      </div>
                    </div>
                  ) : visibleTables.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center min-h-[320px]">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-full bg-surface-container-low mx-auto flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-primary text-[28px]">
                            event_busy
                          </span>
                        </div>

                        <h3 className="font-headline-sm text-headline-sm text-primary">
                          No tables available
                        </h3>

                        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                          There are no tables matching your party size
                          and selected time in this atmosphere.
                        </p>

                        <button
                          type="button"
                          onClick={() => setActiveZone('all')}
                          className="mt-4 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md"
                        >
                          View All Atmospheres
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
                        {visibleTables.map((table) => {
                          const selected =
                            selectedTableId === table.id;

                          return (
                            <button
                              key={table.id}
                              type="button"
                              disabled={!table.available}
                              onClick={() => selectTable(table)}
                              className={`group relative text-left rounded-xl p-4 transition-all duration-300 ${
                                selected
                                  ? 'bg-primary text-on-primary shadow-xl ring-4 ring-primary-fixed/50 scale-[1.02]'
                                  : table.available
                                    ? 'bg-surface-container-low hover:bg-surface-container-high hover:shadow-lg'
                                    : 'bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    selected
                                      ? 'bg-primary-container'
                                      : 'bg-surface-container-lowest'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[22px]">
                                    {getTableIcon(table.zone)}
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                                    selected
                                      ? 'bg-primary-container text-on-primary'
                                      : table.available
                                        ? 'bg-primary-fixed text-on-primary-fixed'
                                        : 'bg-secondary text-on-secondary'
                                  }`}
                                >
                                  {selected
                                    ? 'Selected'
                                    : table.available
                                      ? 'Available'
                                      : 'Unavailable'}
                                </span>
                              </div>

                              <div className="mt-4">
                                <span
                                  className={`font-headline-sm text-headline-sm font-bold ${
                                    selected
                                      ? 'text-on-primary'
                                      : 'text-primary'
                                  }`}
                                >
                                  Table {table.tableNumber}
                                </span>

                                <div
                                  className={`font-label-sm text-label-sm mt-1 ${
                                    selected
                                      ? 'text-on-primary/80'
                                      : 'text-on-surface-variant'
                                  }`}
                                >
                                  {getZoneName(table.zone)} •{' '}
                                  {table.capacity} Seats
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <span
                                  className={`font-label-sm text-label-sm ${
                                    selected
                                      ? 'text-on-primary/80'
                                      : 'text-on-surface-variant'
                                  }`}
                                >
                                  {getSeatingLabel(table)}
                                </span>

                                {selected && (
                                  <span className="material-symbols-outlined text-[20px]">
                                    check_circle
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-on-surface-variant pt-4 border-t border-surface-container font-label-sm text-label-sm">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            touch_app
                          </span>
                          Select a highlighted table to preview its
                          atmosphere.
                        </span>

                        <span className="text-primary font-semibold">
                          {tables.filter((table) => table.available).length}{' '}
                          table
                          {tables.filter((table) => table.available)
                            .length === 1
                            ? ''
                            : 's'}{' '}
                          available
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Detail card */}
                {selectedTable && (
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-md transition-all duration-300">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 relative">
                        <img
                          className="w-full h-full object-cover"
                          alt="Dining atmosphere"
                          src={tableImage}
                        />

                        <div className="absolute bottom-2 left-2 bg-primary/90 text-on-primary px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase">
                          Selected
                        </div>
                      </div>

                      <div className="flex flex-col justify-between w-full h-full">
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-headline-sm text-headline-sm text-primary">
                                Table {selectedTable.tableNumber} —{' '}
                                {getZoneName(selectedTable.zone)}
                              </h3>

                              <span className="material-symbols-outlined text-secondary text-[20px]">
                                star
                              </span>
                            </div>

                            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold whitespace-nowrap">
                              {selectedTable.capacity} Guests
                            </span>
                          </div>

                          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                            {getTableDescription(selectedTable)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-surface-container">
                          <div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                              Seating Type
                            </span>

                            <span className="font-label-md text-label-md text-on-surface font-semibold">
                              {getSeatingLabel(selectedTable)}
                            </span>
                          </div>

                          <div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                              Atmosphere
                            </span>

                            <span className="font-label-md text-label-md text-on-surface font-semibold">
                              {getZoneName(selectedTable.zone)}
                            </span>
                          </div>

                          <div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                              Capacity
                            </span>

                            <span className="font-label-md text-label-md text-on-surface font-semibold">
                              Up to {selectedTable.capacity} guests
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-error-container px-4 py-3 text-error flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px]">
                      error
                    </span>

                    <p className="font-label-md text-label-md">
                      {error}
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 flex flex-col gap-6 sticky top-28">
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-xl flex flex-col gap-6">
                  <div className="pb-4 border-b border-surface-container">
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                      Reservation Overview
                    </span>

                    <h2 className="font-headline-sm text-headline-sm text-primary mt-1">
                      Summary
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          restaurant
                        </span>
                      </div>

                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">
                          Venue
                        </span>

                        <span className="font-label-md text-label-md text-on-surface font-bold">
                          {restaurant?.name ?? 'Restaurant'}
                        </span>

                        <span className="font-body-md text-body-md text-on-surface-variant text-sm block">
                          {restaurant?.address ??
                            restaurant?.city ??
                            'Addis Ababa'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          event
                        </span>
                      </div>

                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">
                          Schedule & Party
                        </span>

                        <span className="font-label-md text-label-md text-on-surface font-semibold block">
                          {dateLabel}
                        </span>

                        <span className="font-label-md text-label-md text-on-surface font-semibold block">
                          {timeLabel}
                        </span>

                        <span className="font-body-md text-body-md text-on-surface-variant text-sm block">
                          Party of {partySize}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          chair
                        </span>
                      </div>

                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">
                          Selected Table
                        </span>

                        {selectedTable ? (
                          <>
                            <span className="font-label-md text-label-md text-primary font-bold block">
                              Table {selectedTable.tableNumber}
                            </span>

                            <span className="font-body-md text-body-md text-on-surface-variant text-sm block">
                              {getZoneName(selectedTable.zone)} •{' '}
                              {selectedTable.capacity} seats
                            </span>
                          </>
                        ) : (
                          <span className="font-label-md text-label-md text-on-surface-variant">
                            No table selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface">
                        Reservation Deposit
                      </span>

                      <span className="font-label-md text-label-md text-primary font-bold">
                        500 ETB
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-on-surface-variant text-xs">
                      <span>Service & Reservation Hold</span>
                      <span>Refundable*</span>
                    </div>

                    <p className="text-[11px] text-on-surface-variant/80 mt-1 leading-relaxed">
                      The deposit is collected in the payment step.
                      Your table selection is not charged on this
                      screen.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={continueToOccasion}
                      disabled={
                        !selectedTable ||
                        availabilityLoading
                      }
                      className="w-full py-4 px-6 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary text-center font-label-md text-label-md transition-all duration-200 shadow-md flex items-center justify-center gap-2 group"
                    >
                      <span>
                        Continue to Guest & Occasion
                      </span>

                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/restaurants/${restaurantId}`,
                        )
                      }
                      className="w-full py-2.5 text-center font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        chevron_left
                      </span>

                      <span>Back to Restaurant Details</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-on-surface-variant/70 font-label-sm text-label-sm pt-2">
                    <span className="material-symbols-outlined text-[14px]">
                      shield
                    </span>

                    <span>
                      Live table availability synchronized
                    </span>
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