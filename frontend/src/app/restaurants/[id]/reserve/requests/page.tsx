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
  description?: string | null;
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

interface RestaurantResponse {
  data?: Restaurant;
}

interface TableResponse {
  data?: Table[];
}

interface Customization {
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

const dietaryOptions = [
  [
    'vegan-tsom',
    "🥬 Fasting (Ye'tsom / Vegan)",
    'Plant-based lentils, shiro & greens',
  ],
  [
    'non-fasting',
    '🥩 Non-Fasting (Yefisik)',
    'Tibs, kitfo & doro wat inclusions',
  ],
  [
    'teff-injera',
    '🌾 100% Pure Teff Injera',
    'Naturally gluten-friendly grain fermentation',
  ],
  [
    'nut-allergy',
    '🥜 Nut Allergy Alert',
    'Strict nut-free preparation protocol',
  ],
  [
    'dairy-free',
    '🥛 Dairy-Free (No Niter Kibbeh)',
    'Substituted with pure sesame or olive oils',
  ],
  [
    'mild-spice',
    '🌶️ Mild Spice / No Mitmita',
    'Gentle alicha seasonings, berbere on side',
  ],
  [
    'halal',
    '🥩 Certified Halal Preparation',
    'All beef and lamb handled through certified Halal supply chain',
  ],
] as const;

const accessibilityOptions = [
  ['wheelchair', 'Wheelchair accessible route & ramp'],
  ['high-chair', 'High chair for toddler (1x)'],
  ['quiet', 'Quiet corner away from live acoustic Masenqo'],
  ['lower', 'Lower seating / traditional Mesob table height'],
] as const;

const addons = [
  {
    id: 'buna',
    name: 'Traditional Ethiopian Buna Ceremony',
    description:
      'Fresh table roasting, Jebena pour, salted popcorn & aromatic frankincense (approx. 45 mins).',
    price: 350,
    priceLabel: '+350 ETB flat fee',
    signature: true,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCo_2pHEqh_j0oAVYAiugjtTxc7yvxqiOrlFe2WSL7OkYEuIR2RO1mBYfg7Im93jOMDgvXpnzibmBz2Ry9oXwEFK8Czu4OLjwo7M8RpUKTDPOMN0g0TbvXWSIFzF5ZqaGc-QDHDrOeRZ3ke4l4kT1-yLCL8kpt0UD6ncsG1bQLnF2bZ0x1eS3Wkun_olpzkpL2FdQJ80-wtVAnvVba_C0q0U8kbiXcCCtcua0n_bOkRdJzvP6Lf00fK',
  },
  {
    id: 'tej',
    name: "Chef's Amuse-Bouche & Aged Tej Pairing",
    description:
      'Artisanal spiced honey wine flight with smoked cottage curd canapés prior to main service.',
    price: 450,
    priceLabel: '+450 ETB per guest',
    signature: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCPB6fij5hw4MbH7ZfjeSA80c9Kx0kyNhjI0JibjKs4kSPq30lfi6gxcC_ZAebL6ttq-H978EfgLWaJ6Kl2gKUcduR5XsrB09SUGSd9NkWmjjBHMkHmCfTBpRXchoTDQe6zHhVaEFwsD2c4afzDjnsAgWIwC-rVEYq85gfVcu77G1sIIirbfWyk1xAc_Kf3Z_nJgvG2lNt1m-UjKXppxxH9qvSKh-hdOsNwYCux5hTLrwQ-pTYI-8QV',
  },
  {
    id: 'floral',
    name: 'Fresh Highland Floral Centerpiece',
    description:
      'Curated local roses and eucalyptus in minimalist ceramic vase with personalized celebration card.',
    price: 400,
    priceLabel: '+400 ETB flat fee',
    signature: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDDBEk5XYr8yzXYhNsunbCS9eZKxPcY617x33s-4mGs0sfcobKVNkgIqwCo6aluEJLMfxLcraTAofc_iR9_IWk5yhfUPAPkolhW-PEP4XPthDJ0a1_wfaYJgTkGiyszWZrr7ZX5Cevemd2Q3okSbKEeNy_9flJIaCM9MHYB6C_-4eVfeq5wlZymmOoYPvrlIA8IUh3FkuK7b7rmsKIL_sIYXzFGqOoqri-hmMU9Jr90k2vH8PbqCI6T',
  },
] as const;

const logo =
  'https://lh3.googleusercontent.com/aida/AEtjO1VmiDA6kGweXDO2uMwdqC1f5e9YN0GTQDKd9-UObpJ06dvmq89ZaNRhRxH3AxctZOAa5kIwjZU-_0tU0f0fMLzewvaEHzU1us2hYmULtN0LFE417dAC6GciXT0MS48A7Icl-7E1gqWGrmf7WeITtFv9E_VMOWOhikyCJ0n6WlrANnFJ22VSlfQnIQfg52HUMokEC7yNsnGUyhkKm-8bB9b8Zecl57kylrakP7q98zPEW5VRXCphSP2AW30';

function tableLabel(table: Table | null) {
  if (!table) {
    return 'Selected table';
  }

  return `Table ${table.table_number ?? table.number ?? table.id}`;
}

function readCustomization(
  restaurantId: number,
  tableId: number,
): Customization {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(
      sessionStorage.getItem(
        `reservation_customization_${restaurantId}_${tableId}`,
      ) || '{}',
    ) as Customization;
  } catch {
    return {};
  }
}

function formatDate(date: string) {
  if (!date) {
    return '—';
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time: string) {
  if (!time) {
    return '—';
  }

  const [hours, minutes] = time.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export default function RequestsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantId = Number(params.id);

  const tableId = Number(searchParams.get('table_id') || 0);
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const partySize = Number(searchParams.get('party_size') || 2);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);

  const [dietary, setDietary] = useState<string[]>([
    'vegan-tsom',
    'teff-injera',
  ]);

  const [selectedAddons, setSelectedAddons] = useState<string[]>(['buna']);

  const [specialNotes, setSpecialNotes] = useState('');

  const [accessibility, setAccessibility] = useState<string[]>([]);

  const [customization, setCustomization] =
    useState<Customization>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /*
   * --------------------------------------------------------------------------
   * AUTH + INITIAL DATA
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    if (!getToken()) {
      const currentPath =
        window.location.pathname + window.location.search;

      router.push(
        `/login?redirect=${encodeURIComponent(currentPath)}`,
      );

      return;
    }

    if (!restaurantId || !tableId) {
      setError(
        'Your booking selection is incomplete. Please return to table selection.',
      );

      setLoading(false);

      return;
    }

    const load = async () => {
      try {
        const [restaurantResponse, tablesResponse] =
          await Promise.all([
            apiFetch<RestaurantResponse>(
              `/restaurants/${restaurantId}`,
            ),

            apiFetch<TableResponse>(
              `/restaurants/${restaurantId}/tables`,
            ),
          ]);

        setRestaurant(restaurantResponse.data ?? null);

        const selected =
          (tablesResponse.data ?? []).find(
            (item) => item.id === tableId,
          ) ?? null;

        setTable(selected);

        setCustomization(
          readCustomization(restaurantId, tableId),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load reservation details.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [restaurantId, tableId, router]);

  /*
   * --------------------------------------------------------------------------
   * OPTION TOGGLES
   * --------------------------------------------------------------------------
   */

  const toggleDietary = (id: string) => {
    setDietary((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleAccessibility = (id: string) => {
    setAccessibility((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  /*
   * --------------------------------------------------------------------------
   * PRICE CALCULATION
   * --------------------------------------------------------------------------
   */

  const addonTotal = useMemo(() => {
    return selectedAddons.reduce((sum, id) => {
      const addon = addons.find((item) => item.id === id);

      if (!addon) {
        return sum;
      }

      if (addon.id === 'tej') {
        return sum + addon.price * partySize;
      }

      return sum + addon.price;
    }, 0);
  }, [selectedAddons, partySize]);

  /*
   * Current product requirement:
   *
   * 500 ETB reservation deposit
   *
   * Add-ons are added on top of the deposit.
   */
  const deposit = 500;

  const total = deposit + addonTotal;

  /*
   * --------------------------------------------------------------------------
   * SAVE STEP 3
   * --------------------------------------------------------------------------
   */

  const saveAndContinue = () => {
    if (!restaurantId || !tableId) {
      setError(
        'Your table selection is missing. Please return to Step 1.',
      );

      return;
    }

    setSaving(true);
    setError('');

    try {
      /*
       * Store Step 3 separately.
       *
       * We do NOT create the reservation here.
       *
       * Step 4 will collect payment/deposit information and is
       * responsible for completing the booking flow.
       */
      sessionStorage.setItem(
        `reservation_requests_${restaurantId}_${tableId}`,
        JSON.stringify({
          dietary,
          selected_addons: selectedAddons,
          addon_total: addonTotal,
          special_notes: specialNotes,
          accessibility,
          updated_at: new Date().toISOString(),
        }),
      );

      /*
       * Keep all booking information in the URL so refreshing the page
       * does not lose the main reservation selection.
       */
      const query = new URLSearchParams({
        restaurant_id: String(restaurantId),
        table_id: String(tableId),
        date,
        time,
        party_size: String(partySize),
        total: String(total),
      });

      /*
       * STEP 4
       *
       * Recommended route:
       * /restaurants/[id]/book/payment
       */
      router.push(
        `/restaurants/${restaurantId}/book/payment?${query.toString()}`,
      );
    } catch {
      setError('Unable to save your request details.');
      setSaving(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * BACK TO STEP 2
   * --------------------------------------------------------------------------
   */

  const backUrl =
    `/restaurants/${restaurantId}/book/occasion` +
    `?restaurant_id=${restaurantId}` +
    `&table_id=${tableId}` +
    `&date=${encodeURIComponent(date)}` +
    `&time=${encodeURIComponent(time)}` +
    `&party_size=${partySize}`;

  /*
   * --------------------------------------------------------------------------
   * LOADING
   * --------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-body-md text-on-surface-variant">
        Loading your reservation workspace…
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * PAGE
   * --------------------------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------ */}

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

      {/* ------------------------------------------------------------------ */}
      {/* MAIN */}
      {/* ------------------------------------------------------------------ */}

      <main className="w-full pt-20 bg-surface min-h-screen">
        <section className="w-full px-container-padding-mobile lg:px-container-padding-desktop pb-24">
          {/* -------------------------------------------------------------- */}
          {/* PROGRESS */}
          {/* -------------------------------------------------------------- */}

          <div className="py-6 mb-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-surface-container-high z-0" />

              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[2px] bg-primary z-0" />

              {[
                ['check', '1. Table'],
                ['check', '2. Occasion'],
                ['3', '3. Requests'],
                ['4', '4. Payment'],
                ['5', '5. Confirm'],
              ].map(([icon, label], index) => {
                const completed = index < 2;
                const current = index === 2;

                return (
                  <div
                    key={label}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
                        completed
                          ? 'bg-primary text-on-primary'
                          : current
                            ? 'bg-primary text-on-primary ring-4 ring-primary/10'
                            : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {completed ? (
                        <span className="material-symbols-outlined text-[18px]">
                          check
                        </span>
                      ) : (
                        <span className="font-label-md text-label-md">
                          {icon}
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-label-sm text-label-sm mt-2 hidden sm:block ${
                        current || completed
                          ? 'text-primary font-bold'
                          : 'text-on-surface-variant/70'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* PAGE TITLE */}
          {/* -------------------------------------------------------------- */}

          <div className="max-w-6xl mx-auto pt-2 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-label-sm text-label-sm tracking-wider uppercase text-secondary font-semibold">
                  Bespoke Hospitality
                </span>

                <span className="w-8 h-[1px] bg-secondary/40" />

                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Step 03 of 05
                </span>
              </div>

              <h1 className="font-headline-md text-headline-md lg:font-display-lg lg:text-display-lg text-primary tracking-tight">
                Dietary Notes &amp; Curated Touches
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">
                Inform the Chef and restaurant staff in advance for a
                harmonious, effortless dining experience.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full self-start md:self-auto">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                restaurant_menu
              </span>

              <span className="font-label-md text-label-md text-primary">
                {restaurant?.name ?? 'Restaurant'}
              </span>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* ERROR */}
          {/* -------------------------------------------------------------- */}

          {error && (
            <div className="max-w-6xl mx-auto mb-6 rounded-lg bg-error-container text-on-error-container px-4 py-3">
              {error}
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* CONTENT */}
          {/* -------------------------------------------------------------- */}

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ============================================================ */}
            {/* LEFT */}
            {/* ============================================================ */}

            <div className="lg:col-span-8 space-y-10">
              {/* ---------------------------------------------------------- */}
              {/* DIETARY */}
              {/* ---------------------------------------------------------- */}

              <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        eco
                      </span>

                      <h2 className="font-headline-sm text-headline-sm text-primary">
                        Dietary Considerations &amp; Fasting (Tsom)
                      </h2>
                    </div>

                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      Select relevant profiles for your dining party.
                      Our kitchen will use these notes when preparing
                      your reservation.
                    </p>
                  </div>

                  <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-3 py-1 rounded-full uppercase tracking-wider hidden sm:block">
                    Multiple choice
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dietaryOptions.map(
                    ([id, title, description]) => {
                      const selected = dietary.includes(id);

                      return (
                        <label
                          key={id}
                          className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                            selected
                              ? 'bg-surface-container-high'
                              : 'bg-surface-container-low hover:bg-surface-container'
                          } ${
                            id === 'halal'
                              ? 'sm:col-span-2'
                              : ''
                          }`}
                        >
                          <input
                            checked={selected}
                            onChange={() =>
                              toggleDietary(id)
                            }
                            className="sr-only"
                            type="checkbox"
                          />

                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center mr-3.5 transition-colors ${
                              selected
                                ? 'bg-primary'
                                : 'bg-surface-container-highest'
                            }`}
                          >
                            {selected && (
                              <span className="material-symbols-outlined text-on-primary text-[16px]">
                                check
                              </span>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="font-label-md text-label-md text-primary">
                              {title}
                            </div>

                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {description}
                            </span>
                          </div>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* ADDONS */}
              {/* ---------------------------------------------------------- */}

              <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    star
                  </span>

                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Curated Experience Upgrades
                  </h2>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant">
                  Transform standard dinner into an unforgettable
                  ceremony with custom table add-ons.
                </p>

                <div className="space-y-4">
                  {addons.map((addon) => {
                    const selected =
                      selectedAddons.includes(addon.id);

                    return (
                      <div
                        key={addon.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 sm:p-5 rounded-xl bg-surface-container-low transition-all duration-200 hover:shadow-md gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-sm"
                            alt=""
                            src={addon.image}
                          />

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-label-md text-label-md text-primary">
                                {addon.name}
                              </span>

                              {addon.signature && (
                                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-semibold">
                                  Signature
                                </span>
                              )}
                            </div>

                            <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">
                              {addon.description}
                            </p>

                            <span className="font-label-sm text-label-sm text-secondary font-semibold">
                              {addon.priceLabel}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            toggleAddon(addon.id)
                          }
                          className={`px-5 py-2.5 rounded-full font-label-md text-label-md shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                            selected
                              ? 'bg-primary text-on-primary hover:opacity-95'
                              : 'bg-surface-container-highest text-primary hover:bg-primary-container hover:text-on-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {selected ? 'check' : 'add'}
                          </span>

                          <span>
                            {selected ? 'Included' : 'Add'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* SPECIAL INSTRUCTIONS */}
              {/* ---------------------------------------------------------- */}

              <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    edit_note
                  </span>

                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Special Instructions for the Kitchen &amp; Server
                  </h2>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant">
                  Coordinate cake presentations, surprise moments,
                  or seating preferences with restaurant staff.
                </p>

                <textarea
                  value={specialNotes}
                  onChange={(event) =>
                    setSpecialNotes(
                      event.target.value.slice(0, 400),
                    )
                  }
                  maxLength={400}
                  placeholder="e.g., We are celebrating a birthday. Please keep the table quiet and bring dessert around 8:15 PM with candle."
                  rows={4}
                  className="w-full p-4 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container transition-colors resize-none"
                />

                <div className="flex justify-between items-center px-1 text-on-surface-variant">
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">
                    Visible to Chef &amp; Head Waiter
                  </span>

                  <span className="font-label-sm text-label-sm">
                    {specialNotes.length} / 400
                  </span>
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* ACCESSIBILITY */}
              {/* ---------------------------------------------------------- */}

              <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    accessible
                  </span>

                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Accessibility &amp; Seating Requirements
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {accessibilityOptions.map(
                    ([id, label]) => {
                      const selected =
                        accessibility.includes(id);

                      return (
                        <label
                          key={id}
                          className={`flex items-center p-3.5 rounded-lg cursor-pointer transition-colors ${
                            selected
                              ? 'bg-surface-container-high'
                              : 'bg-surface-container-low hover:bg-surface-container'
                          }`}
                        >
                          <input
                            checked={selected}
                            onChange={() =>
                              toggleAccessibility(id)
                            }
                            className="w-4 h-4 mr-3 accent-primary"
                            type="checkbox"
                          />

                          <span className="font-label-md text-label-md text-on-surface">
                            {label}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT SIDEBAR */}
            {/* ============================================================ */}

            <aside className="lg:col-span-4 sticky top-28 space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-md space-y-6">
                {/* -------------------------------------------------------- */}
                {/* RESTAURANT */}
                {/* -------------------------------------------------------- */}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-widest">
                      Booking Summary
                    </span>

                    <span className="w-2 h-2 rounded-full bg-surface-tint" />
                  </div>

                  <h3 className="font-headline-sm text-headline-sm text-primary">
                    {restaurant?.name ?? 'Restaurant'}
                  </h3>

                  <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 text-sm">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      location_on
                    </span>

                    {[
                      restaurant?.address,
                      restaurant?.city,
                    ].filter(Boolean).join(', ') ||
                      'Addis Ababa'}
                  </p>
                </div>

                {/* -------------------------------------------------------- */}
                {/* BOOKING DETAILS */}
                {/* -------------------------------------------------------- */}

                <div className="space-y-3 pt-2 text-sm">
                  <div className="flex justify-between py-1 gap-4">
                    <span className="text-on-surface-variant">
                      Assigned Table
                    </span>

                    <span className="text-primary font-semibold text-right">
                      {tableLabel(table)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-on-surface-variant">
                      Guests
                    </span>

                    <span className="text-primary font-semibold">
                      {partySize}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-on-surface-variant">
                      Date
                    </span>

                    <span className="text-primary font-semibold text-right">
                      {formatDate(date)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-on-surface-variant">
                      Time
                    </span>

                    <span className="text-primary font-semibold">
                      {formatTime(time)}
                    </span>
                  </div>

                  {/* ------------------------------------------------------ */}
                  {/* OCCASION */}
                  {/* ------------------------------------------------------ */}

                  {customization.occasion_label && (
                    <div className="flex justify-between py-1 gap-4">
                      <span className="text-on-surface-variant">
                        Occasion
                      </span>

                      <span className="text-secondary font-semibold text-right">
                        {customization.occasion_label}
                      </span>
                    </div>
                  )}

                  {customization.celebrant_name && (
                    <div className="flex justify-between py-1 gap-4">
                      <span className="text-on-surface-variant">
                        Celebrant
                      </span>

                      <span className="text-primary font-semibold text-right">
                        {customization.celebrant_name}
                      </span>
                    </div>
                  )}

                  {/* ------------------------------------------------------ */}
                  {/* ADDONS */}
                  {/* ------------------------------------------------------ */}

                  <div className="pt-2">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant/70 block mb-2">
                      Selected Add-ons
                    </span>

                    {selectedAddons.map((id) => {
                      const addon = addons.find(
                        (item) => item.id === id,
                      );

                      if (!addon) {
                        return null;
                      }

                      const price =
                        addon.id === 'tej'
                          ? addon.price * partySize
                          : addon.price;

                      return (
                        <div
                          key={id}
                          className="flex justify-between py-1 gap-3"
                        >
                          <span className="text-sm">
                            {addon.name}
                          </span>

                          <span className="font-label-md text-label-md text-primary whitespace-nowrap">
                            +{price.toLocaleString()} ETB
                          </span>
                        </div>
                      );
                    })}

                    {!selectedAddons.length && (
                      <span className="text-on-surface-variant">
                        None
                      </span>
                    )}
                  </div>

                  {/* ------------------------------------------------------ */}
                  {/* DEPOSIT */}
                  {/* ------------------------------------------------------ */}

                  <div className="flex justify-between items-start pt-3 bg-surface-container-low p-3 rounded-lg gap-4">
                    <div>
                      <span className="font-label-md text-label-md text-primary block">
                        Table Reservation Deposit
                      </span>

                      <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                        Applied to your final dining bill
                      </span>
                    </div>

                    <span className="font-label-md text-label-md text-primary font-bold whitespace-nowrap">
                      {deposit.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* -------------------------------------------------------- */}
                {/* TOTAL */}
                {/* -------------------------------------------------------- */}

                <div className="bg-surface-container p-4 rounded-lg">
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-headline-sm text-headline-sm text-primary">
                      Due Today
                    </span>

                    <span className="font-headline-sm text-headline-sm text-primary font-bold whitespace-nowrap">
                      {total.toLocaleString()} ETB
                    </span>
                  </div>

                  <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px] text-surface-tint">
                      verified_user
                    </span>

                    Deposit and add-ons shown from this booking
                    selection.
                  </p>
                </div>

                {/* -------------------------------------------------------- */}
                {/* ACTIONS */}
                {/* -------------------------------------------------------- */}

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveAndContinue}
                    className="w-full py-4 px-6 rounded-lg bg-primary hover:bg-primary-container disabled:opacity-60 text-on-primary font-label-md text-label-md text-center flex items-center justify-center gap-2 shadow-lg transition-all group"
                  >
                    <span>
                      {saving
                        ? 'Saving…'
                        : 'Continue to Deposit & Payment'}
                    </span>

                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(backUrl)}
                    className="w-full py-2.5 px-4 text-center font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_back
                    </span>

                    <span>Back to Occasion</span>
                  </button>
                </div>

                {/* -------------------------------------------------------- */}
                {/* TRUST */}
                {/* -------------------------------------------------------- */}

                <div className="pt-4 flex items-center justify-around text-center text-on-surface-variant/80">
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
                      Instant Hold
                    </span>
                  </div>

                  <div className="w-px h-6 bg-surface-container-high" />

                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[20px] text-tertiary">
                      dinner_dining
                    </span>

                    <span className="font-label-sm text-[11px] mt-1">
                      Direct Kitchen Sync
                    </span>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* SUPPORT */}
              {/* ---------------------------------------------------------- */}

              <div className="p-4 rounded-lg bg-surface-container-low flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  support_agent
                </span>

                <div>
                  <h4 className="font-label-md text-label-md text-primary">
                    Need bespoke arrangements?
                  </h4>

                  <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-0.5">
                    {restaurant?.phone
                      ? `Call ${restaurant.phone}`
                      : 'Contact the restaurant directly for special arrangements.'}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER */}
      {/* ------------------------------------------------------------------ */}

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
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                About
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                For Restaurants
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                Contact
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                Privacy
              </a>

              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
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