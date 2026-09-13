"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ArrowRight, Award, Badge, BadgeCheck, Bell, Bot, Box, Building2,
  CalendarDays, CheckCircle2, Clock3, Coffee, Compass, Flame,
  Grid2X2, Heart, HelpCircle, Image as ImageIcon, Leaf, LoaderCircle, Lock,
  Map, MapPin, Menu, MessageCircle, Music2, QrCode, Search, Sparkles, Star, Table2,
  Utensils, Users, Wifi, X, Zap,
} from "lucide-react";

type IconName =
  | "table_restaurant" | "location_on" | "notifications" | "arrow_forward"
  | "menu" | "close" | "local_fire_department" | "stars" | "explore"
  | "calendar_today" | "schedule" | "group" | "progress_activity" | "search"
  | "local_cafe" | "deck" | "table_bar" | "eco" | "music_note" | "verified"
  | "grade" | "restaurant_menu" | "restaurant" | "favorite" | "favorite_border"
  | "map" | "grid_view" | "smart_toy" | "contactless" | "qr_code_2" | "domain"
  | "check_circle" | "badge" | "workspace_premium" | "bolt" | "lock"
  | "view_in_ar" | "panorama" | "chat";

const iconMap = {
  table_restaurant: Table2, location_on: MapPin, notifications: Bell,
  arrow_forward: ArrowRight, menu: Menu, close: X,
  local_fire_department: Flame, stars: Sparkles, explore: Compass,
  calendar_today: CalendarDays, schedule: Clock3, group: Users,
  progress_activity: LoaderCircle, search: Search, local_cafe: Coffee,
  deck: Compass, table_bar: Table2, eco: Leaf, music_note: Music2,
  verified: BadgeCheck, grade: Star, restaurant_menu: Utensils, restaurant: Utensils,
  favorite: Heart, favorite_border: Heart, map: Map, grid_view: Grid2X2,
  smart_toy: Bot, contactless: Wifi, qr_code_2: QrCode, chat: MessageCircle, domain: Building2,
  check_circle: CheckCircle2, badge: Badge, workspace_premium: Award, bolt: Zap,
  lock: Lock, view_in_ar: Box, panorama: ImageIcon,
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const Component = iconMap[name] ?? HelpCircle;
  return <Component aria-hidden="true" className={className} strokeWidth={1.9} />;
}

type Restaurant = {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  phone?: string | null;
  website?: string | null;
  photos?: string[] | string | null;
  image?: string | null;
  rating?: number | string | null;
  reviews_count?: number | null;
  is_active?: boolean;
  approved?: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type RestaurantListResponse =
  | Restaurant[]
  | {
      data?: Restaurant[];
      current_page?: number;
      last_page?: number;
      total?: number;
    };

type Table = {
  id: number;
  restaurant_id: number;
  table_number: number | string;
  capacity: number;
  seating_type?: string | null;
  status?: string | null;
};

type AvailabilitySlot = {
  time?: string;
  reservation_time?: string;
  available?: boolean;
  table_id?: number;
  id?: number;
};

type FloorTable = {
  id: number;
  number: string;
  type: "booth" | "mesob" | "terrace";
  capacity: string;
  status: "available" | "reserved" | "occupied";
  title: string;
  description: string;
  seating: string;
  sound: string;
  lighting: string;
  dietary: string;
  deposit: number;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=85";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=2200&q=90";

const neighborhoodOptions = [
  "Bole",
  "Kazanchis",
  "Old Airport",
  "Piazza",
  "Sarbet",
];

const experienceFilters: { id: string; label: string; icon: IconName }[] = [
  { id: "all", label: "All Venues", icon: "restaurant" },
  { id: "buna", label: "Buna Ceremonies", icon: "local_cafe" },
  { id: "skyline", label: "Skyline & Balconies", icon: "deck" },
  { id: "mesob", label: "Intimate Mesob", icon: "table_bar" },
  { id: "fasting", label: "Ye'tsom Specialists", icon: "eco" },
];

const floorTables: FloorTable[] = [
  {
    id: 12,
    number: "12",
    type: "booth",
    capacity: "2–4 Diners",
    status: "available",
    title: "Cathedral Window Booth",
    description:
      "Unobstructed panoramic twilight views. Positioned away from high-traffic paths for intimate dinners and celebrations.",
    seating: "Plush Velvet Banquet",
    sound: "Acoustic Ethio-Jazz",
    lighting: "Warm Candlelight & Sunset",
    dietary: "Ye'tsom Friendly",
    deposit: 500,
  },
  {
    id: 4,
    number: "04",
    type: "booth",
    capacity: "4 Diners",
    status: "reserved",
    title: "Diplomatic Corner Booth",
    description:
      "A quiet high-back booth suited to private conversations and business dining.",
    seating: "High-Back Leather Booth",
    sound: "Whisper-Quiet",
    lighting: "Dim Tabletop Luminary",
    dietary: "Full Menu",
    deposit: 500,
  },
  {
    id: 8,
    number: "08",
    type: "terrace",
    capacity: "2 Diners",
    status: "available",
    title: "Balcony Panorama Veranda",
    description:
      "Open-air skyline seating with a relaxed Addis evening atmosphere.",
    seating: "Brass & Cane Garden Chairs",
    sound: "Gentle Evening Breeze",
    lighting: "Starlight & Brass Lamps",
    dietary: "Full Heritage Menu",
    deposit: 400,
  },
  {
    id: 2,
    number: "02",
    type: "mesob",
    capacity: "4–6 Diners",
    status: "available",
    title: "Royal Mesob VIP Circle",
    description:
      "Handcrafted mesob seating designed for shared Ethiopian feasting.",
    seating: "Carved Wooden Stools",
    sound: "Near Live Masinko",
    lighting: "Golden Amber Hearth",
    dietary: "Ye'tsom Beyaynetu Ready",
    deposit: 800,
  },
  {
    id: 14,
    number: "14",
    type: "booth",
    capacity: "2 Diners",
    status: "occupied",
    title: "Intimate Bistro Table",
    description:
      "Currently occupied. The table will become available after the current seating.",
    seating: "Walnut Two-Top",
    sound: "Subtle Background Ambience",
    lighting: "Soft Low Glow",
    dietary: "Full Fasting & Meat Menu",
    deposit: 300,
  },
];

function getToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function formatDate(date: string) {
  if (!date) return "Select date";

  const value = new Date(`${date}T00:00:00`);

  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string) {
  if (!time) return "";

  const [hourString, minute = "00"] = time.split(":");
  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function getRestaurantImage(restaurant: Restaurant) {
  if (restaurant.image) return restaurant.image;

  if (Array.isArray(restaurant.photos) && restaurant.photos.length > 0) {
    return restaurant.photos[0];
  }

  if (typeof restaurant.photos === "string" && restaurant.photos.trim()) {
    try {
      const parsed = JSON.parse(restaurant.photos);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    } catch {
      return restaurant.photos;
    }
  }

  return FALLBACK_IMAGE;
}

function getRestaurantCategory(restaurant: Restaurant) {
  const value = `${restaurant.cuisine_type ?? ""} ${
    restaurant.name ?? ""
  }`.toLowerCase();

  if (
    value.includes("ethiopian") ||
    value.includes("traditional") ||
    value.includes("habesha")
  ) {
    return "Cultural Heritage";
  }

  if (
    value.includes("italian") ||
    value.includes("fine dining") ||
    value.includes("french")
  ) {
    return "Legendary Classic";
  }

  if (
    value.includes("fusion") ||
    value.includes("lounge") ||
    value.includes("rooftop")
  ) {
    return "Skyline & Panorama";
  }

  return "Curated Destination";
}

function getRestaurantDescription(restaurant: Restaurant) {
  if (restaurant.description?.trim()) {
    return restaurant.description;
  }

  return "A curated dining destination in Addis Ababa.";
}

function matchesFilter(restaurant: Restaurant, filter: string) {
  if (filter === "all") return true;

  const value = `${restaurant.name ?? ""} ${
    restaurant.description ?? ""
  } ${restaurant.cuisine_type ?? ""}`.toLowerCase();

  switch (filter) {
    case "buna":
      return (
        value.includes("buna") ||
        value.includes("coffee") ||
        value.includes("ethiopian")
      );

    case "skyline":
      return (
        value.includes("skyline") ||
        value.includes("lounge") ||
        value.includes("rooftop") ||
        value.includes("terrace") ||
        value.includes("balcony")
      );

    case "mesob":
      return (
        value.includes("mesob") ||
        value.includes("traditional") ||
        value.includes("ethiopian")
      );

    case "fasting":
      return (
        value.includes("fasting") ||
        value.includes("tsom") ||
        value.includes("vegan") ||
        value.includes("vegetarian")
      );

    default:
      return true;
  }
}

function normalizeRestaurantResponse(
  response: ApiResponse<RestaurantListResponse>
): Restaurant[] {
  if (!response?.data) return [];

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
}

export default function HomePage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantError, setRestaurantError] = useState("");

  const [neighborhood, setNeighborhood] = useState("Bole");
  const [reservationDate, setReservationDate] = useState(getToday());
  const [reservationTime, setReservationTime] = useState("19:30");
  const [partySize, setPartySize] = useState(2);

  const [activeFilter, setActiveFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(12);
  const [tableFilter, setTableFilter] = useState<
    "all" | "booth" | "mesob" | "terrace"
  >("all");

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      try {
        setLoadingRestaurants(true);
        setRestaurantError("");

        const response = await apiFetch<ApiResponse<RestaurantListResponse>>(
          "/restaurants?per_page=100&page=1"
        );

        if (cancelled) return;

        const data = normalizeRestaurantResponse(response);

        setRestaurants(
          data.filter(
            (restaurant) =>
              restaurant.is_active !== false && restaurant.approved !== false
          )
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load restaurants:", error);

        setRestaurantError(
          "We could not load the restaurants right now. Please try again."
        );
      } finally {
        if (!cancelled) {
          setLoadingRestaurants(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((restaurant) => matchesFilter(restaurant, activeFilter))
      .slice(0, 8);
  }, [restaurants, activeFilter]);

  const selectedTable = useMemo(
    () =>
      floorTables.find((table) => table.id === selectedTableId) ??
      floorTables[0],
    [selectedTableId]
  );

  const visibleFloorTables = useMemo(() => {
    if (tableFilter === "all") return floorTables;

    return floorTables.filter((table) => table.type === tableFilter);
  }, [tableFilter]);

  const availableRestaurantCount = restaurants.length;

  const averageRating = useMemo(() => {
    const ratings = restaurants
      .map((restaurant) => Number(restaurant.rating))
      .filter((rating) => Number.isFinite(rating) && rating > 0);

    if (!ratings.length) return "—";

    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return (total / ratings.length).toFixed(2);
  }, [restaurants]);

  const totalReviews = useMemo(() => {
    return restaurants.reduce(
      (sum, restaurant) => sum + Number(restaurant.reviews_count ?? 0),
      0
    );
  }, [restaurants]);

  const handleFindTables = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reservationDate || !reservationTime || partySize < 1) {
      setAvailabilityMessage(
        "Please choose a date, time, and valid number of guests."
      );
      return;
    }

    try {
      setAvailabilityLoading(true);
      setAvailabilityMessage("");

      /*
       * We use the real backend availability endpoint here.
       * The endpoint belongs to a specific restaurant, so the landing page
       * first chooses a restaurant and then checks its real availability.
       */
      const targetRestaurant =
        restaurants.find((restaurant) => {
          const location = `${restaurant.address ?? ""} ${
            restaurant.city ?? ""
          }`.toLowerCase();

          return (
            neighborhood === "Bole"
              ? location.includes("bole")
              : neighborhood === "Kazanchis"
                ? location.includes("kazanchis")
                : neighborhood === "Piazza"
                  ? location.includes("piazza")
                  : neighborhood === "Sarbet"
                    ? location.includes("sarbet")
                    : location.includes("airport")
          );
        }) ?? restaurants[0];

      if (!targetRestaurant) {
        setAvailabilityMessage(
          "No restaurants are currently available. Please try again shortly."
        );
        return;
      }

      const response = await apiFetch<
        ApiResponse<{ slots?: AvailabilitySlot[] }>
      >(
        `/restaurants/${targetRestaurant.id}/availability?date=${encodeURIComponent(
          reservationDate
        )}&time=${encodeURIComponent(
          reservationTime
        )}&party_size=${partySize}`
      );

      const slots = response?.data?.slots ?? [];

      const matchingSlot = slots.find((slot) => {
        const slotTime = slot.time ?? slot.reservation_time ?? "";

        return (
          slotTime === reservationTime &&
          slot.available !== false &&
          (slot.table_id || slot.id)
        );
      });

      if (!matchingSlot) {
        setAvailabilityMessage(
          `No table was found at ${formatTime(
            reservationTime
          )} for ${partySize} guest${partySize === 1 ? "" : "s"} at ${
            targetRestaurant.name
          }.`
        );

        return;
      }

      const tableId = matchingSlot.table_id ?? matchingSlot.id;

      if (!tableId) {
        setAvailabilityMessage(
          "A table is available, but its table ID was not returned by the backend."
        );
        return;
      }

      const params = new URLSearchParams({
        date: reservationDate,
        time: reservationTime,
        party_size: String(partySize),
        table_id: String(tableId),
      });

      router.push(
        `/restaurants/${targetRestaurant.id}/reserve?${params.toString()}`
      );
    } catch (error) {
      console.error("Availability check failed:", error);

      setAvailabilityMessage(
        "We could not check availability right now. Please try again."
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleRestaurantBooking = (restaurant: Restaurant) => {
    const params = new URLSearchParams({
      date: reservationDate,
      time: reservationTime,
      party_size: String(partySize),
    });

    router.push(`/restaurants/${restaurant.id}/reserve?${params.toString()}`);
  };

  const toggleFavorite = (restaurantId: number) => {
    setFavorites((current) =>
      current.includes(restaurantId)
        ? current.filter((id) => id !== restaurantId)
        : [...current, restaurantId]
    );
  };

  const scrollToRestaurants = () => {
    document
      .getElementById("restaurants")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b]">
      {/* =========================================================
          HEADER
      ========================================================== */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#c1c8c4]/30 bg-[#fcf9f8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-6 px-5 lg:px-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2"
              aria-label="DINEET home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#01261f] text-[#ffe088] shadow-sm">
                <Icon name="table_restaurant" className="h-[21px] w-[21px]" />
              </div>

              <span className="font-serif text-[23px] font-bold tracking-tight text-[#01261f]">
                DINEET
              </span>
            </Link>

            <nav className="hidden xl:flex items-center gap-1">
              <button
                onClick={scrollToRestaurants}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
              >
                Explore Venues
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("technology")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
              >
                Dining Experiences
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("concierge")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
              >
                Ask DINEET
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("passport")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
              >
                Dining Passport
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("operators")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
              >
                For Restaurants
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-[#f6f3f2] px-3 py-1.5 text-xs font-semibold text-[#414846]">
              <Icon name="location_on" className="h-[17px] w-[17px] text-[#934a2d]" />
              Addis Ababa 🇪🇹
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-[#414846] transition hover:bg-[#f0edec] hover:text-[#01261f]"
            >
              <Icon name="notifications" className="h-[21px] w-[21px]" />
            </button>

            <Link
              href="/login"
              className="hidden sm:block rounded-lg px-3 py-2 text-sm font-semibold text-[#01261f] transition hover:bg-[#f0edec]"
            >
              Sign In
            </Link>

            <button
              onClick={scrollToRestaurants}
              className="hidden sm:flex items-center gap-2 rounded-lg bg-[#01261f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a3c34]"
            >
              Find a Table
              <Icon name="arrow_forward" className="h-[17px] w-[17px]" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#01261f] text-white xl:hidden"
              aria-label="Open menu"
            >
              <Icon name={isMobileMenuOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-[#c1c8c4]/30 bg-[#fcf9f8] px-5 py-4 shadow-lg xl:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  scrollToRestaurants();
                }}
                className="rounded-lg px-3 py-3 text-left text-sm font-semibold"
              >
                Explore Venues
              </button>

              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20">
        {/* =========================================================
            HERO
        ========================================================== */}
        <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden px-5 py-16 lg:px-16">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center"
            style={{
              backgroundImage: `url("${HERO_IMAGE}")`,
            }}
          />

          <div className="absolute inset-0 bg-[#01261f]/75" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#01261f] via-[#01261f]/45 to-[#01261f]/25" />

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(1,38,31,.55)_100%)]" />

          <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-10 pt-6 lg:gap-14">
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5eadf] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c5eadf]" />
                </span>
                Addis Ababa Live Seating
                <span className="text-white/50">•</span>
                {availableRestaurantCount > 0
                  ? `${availableRestaurantCount} venues online`
                  : "Live venue network"}
              </div>

              <div className="hidden items-center gap-2 rounded-full bg-[#934a2d]/90 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md sm:flex">
                <Icon name="local_fire_department" className="h-4 w-4" />
                Prime tables available tonight
              </div>
            </div>

            <div className="flex max-w-4xl flex-col items-center gap-5 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe088] backdrop-blur-sm">
                <Icon name="stars" className="h-4 w-4" />
                The Premier Hospitality Network of Ethiopia
              </div>

              <h1 className="font-serif text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
                Where Extraordinary Moments Meet{" "}
                <span className="font-normal italic text-[#ffe088]">
                  Ethiopian Hospitality
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                Discover Addis Ababa&apos;s finest dining destinations,
                cultural experiences, skyline lounges, and intimate tables—all
                from one seamless reservation platform.
              </p>
            </div>

            {/* RESERVATION BAR */}
            <div className="w-full max-w-5xl rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur-xl lg:p-6">
              <form
                onSubmit={handleFindTables}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12"
              >
                <div className="flex items-center gap-3 rounded-xl bg-[#f6f3f2] p-3 lg:col-span-3">
                  <Icon name="explore" className="text-[#934a2d]" />

                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                      Neighborhood
                    </label>

                    <select
                      value={neighborhood}
                      onChange={(event) =>
                        setNeighborhood(event.target.value)
                      }
                      className="w-full truncate bg-transparent text-sm font-semibold text-[#1c1b1b] outline-none"
                    >
                      {neighborhoodOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#f6f3f2] p-3 lg:col-span-3">
                  <Icon name="calendar_today" className="text-[#934a2d]" />

                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                      Date
                    </label>

                    <input
                      type="date"
                      min={getToday()}
                      value={reservationDate}
                      onChange={(event) =>
                        setReservationDate(event.target.value)
                      }
                      className="w-full bg-transparent text-sm font-semibold text-[#1c1b1b] outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#f6f3f2] p-3 lg:col-span-3">
                  <Icon name="schedule" className="text-[#934a2d]" />

                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                      Time
                    </label>

                    <input
                      type="time"
                      value={reservationTime}
                      onChange={(event) =>
                        setReservationTime(event.target.value)
                      }
                      className="w-full bg-transparent text-sm font-semibold text-[#1c1b1b] outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#f6f3f2] p-3 lg:col-span-1">
                  <Icon name="group" className="text-[#934a2d]" />

                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                      Guests
                    </label>

                    <select
                      value={partySize}
                      onChange={(event) =>
                        setPartySize(Number(event.target.value))
                      }
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map(
                        (size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={availabilityLoading}
                  className="flex min-h-[60px] items-center justify-center gap-2 rounded-xl bg-[#01261f] px-5 text-sm font-bold tracking-wide text-white shadow-md transition hover:bg-[#1a3c34] disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
                >
                  <Icon
                    name={availabilityLoading ? "progress_activity" : "search"}
                    className="h-5 w-5"
                  />

                  {availabilityLoading
                    ? "Checking..."
                    : "Find Available Tables"}
                </button>
              </form>

              {availabilityMessage && (
                <div className="mt-4 rounded-xl border border-[#934a2d]/20 bg-[#fff7f3] px-4 py-3 text-sm font-medium text-[#78351a]">
                  {availabilityMessage}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#01261f]">
                    Curated Tastes:
                  </span>

                  {[
                    ["local_cafe", "Buna Rituals"],
                    ["deck", "Skyline Terraces"],
                    ["table_bar", "Private Mesobs"],
                    ["eco", "Ye'tsom"],
                    ["music_note", "Live Ethio-Jazz"],
                  ].map(([icon, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "Buna Rituals") {
                          setActiveFilter("buna");
                          scrollToRestaurants();
                        }

                        if (label === "Skyline Terraces") {
                          setActiveFilter("skyline");
                          scrollToRestaurants();
                        }

                        if (label === "Private Mesobs") {
                          setActiveFilter("mesob");
                          scrollToRestaurants();
                        }

                        if (label === "Ye'tsom") {
                          setActiveFilter("fasting");
                          scrollToRestaurants();
                        }
                      }}
                      className="flex items-center gap-1 rounded-full bg-[#f0edec] px-2.5 py-1.5 text-xs font-medium text-[#1c1b1b] transition hover:bg-[#01261f] hover:text-white"
                    >
                      <Icon name={icon as IconName} className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-[#01261f]">
                  <Icon name="verified" className="h-4 w-4 text-[#934a2d]" />
                  Secure reservations • No fake payment confirmation
                </div>
              </div>
            </div>

            <div className="text-sm text-white/70">
              Booking for{" "}
              <span className="font-semibold text-white">
                {partySize} guest{partySize === 1 ? "" : "s"}
              </span>{" "}
              on{" "}
              <span className="font-semibold text-white">
                {formatDate(reservationDate)}
              </span>{" "}
              at{" "}
              <span className="font-semibold text-white">
                {formatTime(reservationTime)}
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================
            METRICS
        ========================================================== */}
        <section className="bg-[#f6f3f2] px-5 py-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="font-serif text-4xl font-bold text-[#01261f]">
                  {loadingRestaurants ? "…" : `${availableRestaurantCount}+`}
                </div>

                <div className="mt-1 text-sm font-medium text-[#717976]">
                  Curated Venues
                </div>
              </div>

              <div className="text-center">
                <div className="font-serif text-4xl font-bold text-[#01261f]">
                  {totalReviews > 0
                    ? `${totalReviews.toLocaleString()}+`
                    : "Live"}
                </div>

                <div className="mt-1 text-sm font-medium text-[#717976]">
                  Guest Reviews
                </div>
              </div>

              <div className="text-center">
                <div className="font-serif text-4xl font-bold text-[#01261f]">
                  {averageRating}
                </div>

                <div className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-[#717976]">
                  Average Rating
                  <Icon name="grade" className="h-[17px] w-[17px] text-[#934a2d]" />
                </div>
              </div>

              <div className="text-center">
                <div className="font-serif text-4xl font-bold text-[#01261f]">
                  24/7
                </div>

                <div className="mt-1 text-sm font-medium text-[#717976]">
                  Reservation Access
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-[#c1c8c4]/40 pt-8">
              <div className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#717976]">
                Discover Addis Ababa&apos;s Dining Community
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-8 text-lg font-bold text-[#414846]/70 grayscale">
                <span>KATEGNA</span>
                <span>YOD ABYSSINIA</span>
                <span className="font-serif italic">CASTELLI</span>
                <span>BOLE SKYLINE</span>
                <span>GUSTO</span>
                <span>BEN ABEBA</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            RESTAURANTS
        ========================================================== */}
        <section
          id="restaurants"
          className="bg-[#fcf9f8] px-5 py-16 lg:px-16 lg:py-24"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#934a2d]">
                  <Icon name="restaurant_menu" className="h-[18px] w-[18px]" />
                  Handpicked Culinary Destinations
                </div>

                <h2 className="mt-2 font-serif text-3xl font-bold text-[#01261f] sm:text-4xl">
                  Curated Tables for Tonight in Addis
                </h2>

                <p className="mt-3 text-base leading-7 text-[#717976]">
                  Real restaurants from your Laravel backend, with live
                  restaurant information and direct access to the reservation
                  experience.
                </p>
              </div>

              <div className="flex max-w-full gap-2 overflow-x-auto pb-2">
                {experienceFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeFilter === filter.id
                        ? "bg-[#01261f] text-white shadow-sm"
                        : "bg-[#f0edec] text-[#1c1b1b] hover:bg-[#e5e2e1]"
                    }`}
                  >
                    <Icon name={filter.icon as IconName} className="h-4 w-4" />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {restaurantError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
                {restaurantError}
              </div>
            )}

            {loadingRestaurants ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    <div className="h-56 animate-pulse bg-[#e5e2e1]" />

                    <div className="space-y-3 p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-[#e5e2e1]" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[#e5e2e1]" />
                      <div className="h-12 animate-pulse rounded bg-[#e5e2e1]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="rounded-2xl bg-[#f6f3f2] p-10 text-center">
                <Icon name="restaurant" className="h-9 w-9 text-[#717976]" />

                <h3 className="mt-3 font-serif text-2xl font-bold text-[#01261f]">
                  No restaurants match this filter
                </h3>

                <p className="mt-2 text-sm text-[#717976]">
                  Try another experience or return to all venues.
                </p>

                <button
                  onClick={() => setActiveFilter("all")}
                  className="mt-5 rounded-xl bg-[#01261f] px-5 py-3 text-sm font-bold text-white"
                >
                  Show All Venues
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {filteredRestaurants.map((restaurant) => {
                  const rating = Number(restaurant.rating ?? 0);
                  const image = getRestaurantImage(restaurant);
                  const category = getRestaurantCategory(restaurant);

                  return (
                    <article
                      key={restaurant.id}
                      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={image}
                          alt={restaurant.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />

                        <div className="absolute left-3 top-3 rounded-full bg-[#01261f]/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                          {category}
                        </div>

                        <button
                          type="button"
                          aria-label={
                            favorites.includes(restaurant.id)
                              ? "Remove from favorites"
                              : "Save restaurant"
                          }
                          onClick={() => toggleFavorite(restaurant.id)}
                          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#01261f] backdrop-blur-md transition hover:text-red-600"
                        >
                          <Icon
                            name={favorites.includes(restaurant.id) ? "favorite" : "favorite_border"}
                            className="h-[19px] w-[19px]"
                          />
                        </button>

                        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-sm font-semibold text-[#1c1b1b] backdrop-blur-md">
                          <Icon name="grade" className="h-4 w-4 text-[#934a2d]" />

                          {rating > 0 ? rating.toFixed(1) : "New"}

                          {restaurant.reviews_count ? (
                            <span className="text-xs text-[#717976]">
                              ({restaurant.reviews_count})
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-5 p-5">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-[#01261f]">
                            {restaurant.name}
                          </h3>

                          <p className="mt-1 text-xs font-semibold text-[#934a2d]">
                            {restaurant.address ||
                              restaurant.city ||
                              "Addis Ababa"}
                            {restaurant.cuisine_type
                              ? ` • ${restaurant.cuisine_type}`
                              : ""}
                          </p>

                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#717976]">
                            {getRestaurantDescription(restaurant)}
                          </p>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                            <span>Reservation</span>

                            {restaurant.opening_time &&
                            restaurant.closing_time ? (
                              <span className="text-[#43655c]">
                                {restaurant.opening_time} –{" "}
                                {restaurant.closing_time}
                              </span>
                            ) : (
                              <span className="text-[#43655c]">
                                Online booking
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRestaurantBooking(restaurant)
                              }
                              className="flex-1 rounded-xl bg-[#01261f] py-2.5 text-sm font-bold text-white transition hover:bg-[#1a3c34]"
                            >
                              Reserve Table
                            </button>

                            <Link
                              href={`/restaurants/${restaurant.id}`}
                              className="flex items-center justify-center rounded-xl border border-[#c1c8c4] px-3 text-[#01261f] transition hover:bg-[#f6f3f2]"
                              aria-label={`View ${restaurant.name}`}
                            >
                              <Icon name="arrow_forward" className="h-[18px] w-[18px]" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col items-center justify-between gap-5 rounded-2xl bg-[#f6f3f2] p-6 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#01261f] text-white">
                  <Icon name="map" className="h-6 w-6" />
                </div>

                <div>
                  <h4 className="font-serif text-lg font-bold text-[#01261f]">
                    Looking for an unforgettable table?
                  </h4>

                  <p className="text-sm text-[#717976]">
                    Explore real restaurant availability across Addis Ababa.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter("all");
                  scrollToRestaurants();
                }}
                className="rounded-xl bg-[#01261f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1a3c34]"
              >
                Explore All Venues →
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            TECHNOLOGY
        ========================================================== */}
        <section
          id="technology"
          className="bg-[#f6f3f2] px-5 py-20 lg:px-16"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-14">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#934a2d]">
                DINEET Technology
              </span>

              <h2 className="mt-3 font-serif text-3xl font-bold text-[#01261f] sm:text-4xl">
                Engineered for Effortless Addis Dining
              </h2>

              <p className="mt-3 text-base leading-7 text-[#717976]">
                A modern reservation experience built around Ethiopian
                hospitality, precise table selection, and your existing
                restaurant backend.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* FLOORPLAN */}
              <div className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0edec] text-[#01261f]">
                    <Icon name="grid_view" className="h-[26px] w-[26px]" />
                  </div>

                  <h3 className="mt-4 font-serif text-2xl font-bold text-[#01261f]">
                    Interactive Floorplan
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#717976]">
                    Give diners the ability to inspect seating options before
                    they enter the reservation journey.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl bg-[#01261f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1a3c34]"
                >
                  Preview Interactive Floorplan
                </button>
              </div>

              {/* AI */}
              <div
                id="concierge"
                className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0edec] text-[#01261f]">
                    <Icon name="smart_toy" className="h-[26px] w-[26px]" />
                  </div>

                  <h3 className="mt-4 font-serif text-2xl font-bold text-[#01261f]">
                    Ask DINEET Concierge
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#717976]">
                    Help diners discover restaurants based on cuisine,
                    atmosphere, fasting preferences, location, occasion, and
                    available tables.
                  </p>
                </div>

                <div className="rounded-xl bg-[#f6f3f2] p-4">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#934a2d] text-[10px] font-bold text-white">
                      YOU
                    </div>

                    <div className="rounded-xl bg-white p-3 text-xs leading-5 shadow-sm">
                      Quiet romantic dinner in Bole with Ye&apos;tsom-friendly
                      options?
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#01261f] text-[10px] font-bold text-white">
                      AI
                    </div>

                    <div className="rounded-xl bg-[#01261f] p-3 text-xs leading-5 text-white shadow-sm">
                      I&apos;ll help you find a matching restaurant and check
                      its real availability.
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT */}
              <div className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0edec] text-[#01261f]">
                    <Icon name="contactless" className="h-[26px] w-[26px]" />
                  </div>

                  <h3 className="mt-4 font-serif text-2xl font-bold text-[#01261f]">
                    Local Payment Ready
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#717976]">
                    The reservation journey is designed for Telebirr, CBE
                    Birr, and other Ethiopian payment providers.
                  </p>
                </div>

                <div className="rounded-xl bg-[#01261f] p-4 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold">
                      DINEET RESERVATION
                    </span>

                    <Icon name="qr_code_2" className="text-[#ffe088]" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase text-white/50">
                        Status
                      </span>
                      <span className="font-bold">Reservation Ready</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase text-white/50">
                        Payment
                      </span>
                      <span className="font-bold">Gateway Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            OPERATOR SECTION
        ========================================================== */}
        <section
          id="operators"
          className="relative overflow-hidden bg-[#01261f] px-5 py-20 text-white lg:px-16"
        >
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#1a3c34]/50 blur-3xl" />

          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#934a2d]/20 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#1a3c34] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#c5eadf]">
                <Icon name="domain" className="h-4 w-4" />
                DINEET for Restaurant Operators
              </div>

              <h2 className="mt-5 font-serif text-4xl font-bold leading-tight sm:text-5xl">
                Turn Every Table into Memorable{" "}
                <span className="italic text-[#ffe088]">
                  Ethiopian Hospitality
                </span>
              </h2>

              <p className="mt-5 text-lg leading-8 text-white/75">
                Give your restaurant team better visibility into reservations,
                tables, guest details, special requests, and the dining
                experience.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {[
                  ["check_circle", "Real Reservation Data"],
                  ["check_circle", "Guest Management"],
                  ["check_circle", "Table Visibility"],
                  ["check_circle", "Reservation Status Tracking"],
                ].map(([icon, title]) => (
                  <div key={title} className="flex items-start gap-3">
                    <Icon name={icon as IconName} className="mt-0.5 h-5 w-5 text-[#ffe088]" />

                    <div>
                      <h4 className="text-sm font-bold">{title}</h4>

                      <p className="mt-1 text-xs leading-5 text-white/60">
                        Connected to the restaurant management workflow.
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-xl bg-[#934a2d] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#ffa17e] hover:text-[#4e1c0b]"
                >
                  Partner With DINEET
                  <Icon name="arrow_forward" className="h-[18px] w-[18px]" />
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl bg-[#1a3c34] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#c5eadf] hover:text-[#01261f]"
                >
                  Operator Login
                </Link>
              </div>
            </div>

            {/* HOST TERMINAL */}
            <div className="rounded-2xl bg-[#1a3c34]/90 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-[#c5eadf]" />

                  <div>
                    <span className="block text-sm font-bold">
                      Host Stand Terminal
                    </span>

                    <span className="text-xs text-[#c5eadf]">
                      Reservation Operations
                    </span>
                  </div>
                </div>

                <span className="rounded bg-[#01261f] px-2.5 py-1 text-xs font-semibold">
                  LIVE
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {[
                  {
                    table: "T14",
                    guest: "Reservation #14",
                    detail: "4 Guests • Ye'tsom Request",
                    status: "Confirmed",
                  },
                  {
                    table: "T06",
                    guest: "Reservation #06",
                    detail: "2 Guests • Window Seating",
                    status: "Arriving",
                  },
                  {
                    table: "T19",
                    guest: "Reservation #19",
                    detail: "6 Guests • Birthday",
                    status: "Pending",
                  },
                ].map((item) => (
                  <div
                    key={item.table}
                    className="flex items-center justify-between rounded-xl bg-[#01261f]/90 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                        {item.table}
                      </span>

                      <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.guest}
                        </span>

                        <span className="block truncate text-xs text-white/60">
                          {item.detail}
                        </span>
                      </div>
                    </div>

                    <span className="ml-3 shrink-0 rounded bg-[#1a3c34] px-2 py-1 text-[10px] font-bold text-[#c5eadf]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#01261f]/70 p-2.5">
                  <span className="block text-[10px] text-white/50">
                    Tables
                  </span>
                  <span className="text-sm font-bold">Live</span>
                </div>

                <div className="rounded-lg bg-[#01261f]/70 p-2.5">
                  <span className="block text-[10px] text-white/50">
                    Reservations
                  </span>
                  <span className="text-sm font-bold">Synced</span>
                </div>

                <div className="rounded-lg bg-[#01261f]/70 p-2.5">
                  <span className="block text-[10px] text-white/50">
                    Status
                  </span>
                  <span className="text-sm font-bold text-[#c5eadf]">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            DINING PASSPORT
        ========================================================== */}
        <section
          id="passport"
          className="bg-[#fcf9f8] px-5 py-16 lg:px-16 lg:py-24"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 md:flex-row">
            <div className="md:w-1/2">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#934a2d]">
                <Icon name="badge" className="h-5 w-5" />
                The Mesob Dining Passport
              </div>

              <h2 className="mt-3 font-serif text-3xl font-bold text-[#01261f] sm:text-4xl">
                Turn Every Dinner into a Passport Stamp
              </h2>

              <p className="mt-4 text-base leading-7 text-[#717976]">
                Build your DINEET dining history as you explore restaurants
                across Addis Ababa and discover new hospitality experiences.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                {[
                  "Book and check in through DINEET",
                  "Discover restaurants across Addis Ababa",
                  "Build your dining history and unlock future benefits",
                ].map((text, index) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffdbcf] text-xs font-bold text-[#380d00]">
                      {index + 1}
                    </span>

                    <span className="text-sm font-medium text-[#1c1b1b]">
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={scrollToRestaurants}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#01261f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1a3c34]"
              >
                Start Exploring
                <Icon name="arrow_forward" className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="w-full max-w-md rounded-3xl bg-[#f0edec] p-6 shadow-xl md:w-1/2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl font-bold text-[#01261f]">
                    ADDIS PASSPORT
                  </span>

                  <span className="rounded bg-[#735c00] px-2 py-0.5 text-[10px] font-bold text-white">
                    GOLD
                  </span>
                </div>

                <Icon name="workspace_premium" className="h-[26px] w-[26px] text-[#934a2d]" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {["Bole", "Piazza", "Kazanchis"].map((area, index) => (
                  <div
                    key={area}
                    className="flex h-24 flex-col items-center justify-center rounded-2xl bg-white p-2 text-center shadow-sm"
                  >
                    <Icon
                      name={index === 2 ? "local_fire_department" : "verified"}
                      className="h-6 w-6 text-[#01261f]"
                    />

                    <span className="mt-1 text-xs font-bold text-[#01261f]">
                      {area}
                    </span>

                    <span className="mt-1 text-[9px] uppercase text-[#717976]">
                      {index + 1} visit
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-white p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#01261f]">
                    Dining progress
                  </span>

                  <span className="font-bold text-[#934a2d]">3 / 5</span>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e5e2e1]">
                  <div
                    className="h-full rounded-full bg-[#934a2d]"
                    style={{ width: "60%" }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-[#717976]">
                  Keep exploring Addis dining destinations to build your
                  passport.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================== */}
        <section className="bg-[#f6f3f2] px-5 py-20 text-center lg:px-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#934a2d] shadow-sm">
              <Icon name="table_bar" className="h-[18px] w-[18px]" />
              Instant Reservation Access
            </div>

            <h2 className="font-serif text-4xl font-bold tracking-tight text-[#01261f] sm:text-5xl">
              Your Table is Waiting in Addis Ababa.
            </h2>

            <p className="max-w-xl text-lg leading-8 text-[#717976]">
              Explore real restaurants, choose your preferred date and time,
              select your table, and move through the DINEET reservation
              experience.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-3">
              <button
                onClick={scrollToRestaurants}
                className="flex items-center gap-2 rounded-xl bg-[#01261f] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-[#1a3c34]"
              >
                Reserve a Table
                <Icon name="arrow_forward" className="h-5 w-5" />
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("concierge")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-[#01261f] shadow-sm transition hover:bg-[#fcf9f8]"
              >
                <Icon name="chat" className="h-5 w-5 text-[#934a2d]" />
                Ask DINEET
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 pt-5 text-xs font-medium text-[#717976]">
              <span className="flex items-center gap-1.5">
                <Icon name="bolt" className="h-[18px] w-[18px] text-[#01261f]" />
                Real-time availability
              </span>

              <span className="flex items-center gap-1.5">
                <Icon name="table_restaurant" className="h-[18px] w-[18px] text-[#01261f]" />
                Table selection
              </span>

              <span className="flex items-center gap-1.5">
                <Icon name="lock" className="h-[18px] w-[18px] text-[#01261f]" />
                Secure reservation flow
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="bg-[#f0edec] px-5 py-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#01261f] text-[#ffe088]">
                  <Icon name="table_restaurant" className="h-5 w-5" />
                </div>

                <span className="font-serif text-2xl font-bold text-[#01261f]">
                  DINEET
                </span>
              </div>

              <p className="mt-4 font-serif text-xl italic text-[#01261f]">
                Ethiopian Hospitality Reimagined
              </p>

              <p className="mt-3 max-w-md text-sm leading-6 text-[#717976]">
                A modern dining reservation platform connecting guests with
                restaurants across Addis Ababa.
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-[#717976]">
                <span>Payment-ready:</span>

                <span className="rounded bg-[#e5e2e1] px-2 py-1 font-semibold text-[#1c1b1b]">
                  Telebirr
                </span>

                <span className="rounded bg-[#e5e2e1] px-2 py-1 font-semibold text-[#1c1b1b]">
                  CBE Birr
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                For Diners
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <button onClick={scrollToRestaurants} className="text-left hover:text-[#01261f]">
                  Explore Venues
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("technology")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Dining Experiences
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("passport")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Dining Passport
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                For Operators
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <button
                  onClick={() =>
                    document
                      .getElementById("operators")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Restaurant Suite
                </button>

                <Link href="/login" className="hover:text-[#01261f]">
                  Operator Portal
                </Link>

                <button
                  onClick={() => setModalOpen(true)}
                  className="text-left hover:text-[#01261f]"
                >
                  Floorplan & Tables
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                Account
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <Link href="/login" className="hover:text-[#01261f]">
                  Sign In
                </Link>

                <Link href="/register" className="hover:text-[#01261f]">
                  Create Account
                </Link>

                <Link href="/reservations" className="hover:text-[#01261f]">
                  My Reservations
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#c1c8c4]/40 pt-6 text-xs text-[#717976] md:flex-row">
            <p>© 2026 DINEET Hospitality Technologies.</p>

            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#01261f]" />
                System Operational
              </span>

              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================
          FLOORPLAN MODAL
      ========================================================== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#01261f]/75 p-3 backdrop-blur-md sm:p-6 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="floorplan-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:rounded-3xl">
            {/* MODAL HEADER */}
            <div className="flex flex-col gap-4 border-b border-[#c1c8c4]/30 bg-[#f6f3f2] p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#01261f] text-white">
                  <Icon name="view_in_ar" className="" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="floorplan-title"
                      className="font-serif text-lg font-bold text-[#01261f] sm:text-xl"
                    >
                      Interactive Table Preview
                    </h2>

                    <span className="rounded-full bg-[#c5eadf] px-2 py-0.5 text-[10px] font-bold text-[#00201a]">
                      DINEET
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#717976]">
                    Choose a seating style and continue into your reservation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#414846] shadow-sm transition hover:text-[#01261f] lg:static"
                aria-label="Close floorplan"
              >
                <Icon name="close" className="" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden">
              {/* FLOORPLAN */}
              <div className="border-b border-[#c1c8c4]/30 bg-[#fcf9f8] p-4 sm:p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
                <div className="flex gap-2 overflow-x-auto pb-3">
                  {[
                    ["all", "All Tables"],
                    ["booth", "Window Booths"],
                    ["mesob", "Private Mesob"],
                    ["terrace", "Terrace"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setTableFilter(
                          id as "all" | "booth" | "mesob" | "terrace"
                        )
                      }
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
                        tableFilter === id
                          ? "bg-[#01261f] text-white"
                          : "bg-[#e5e2e1] text-[#1c1b1b]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#c1c8c4]/30 bg-[#f0edec] p-4 shadow-inner sm:aspect-[16/10] sm:p-6">
                  <div className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-[10px] text-[#414846] backdrop-blur">
                    <div className="flex items-center gap-1.5 font-semibold text-[#01261f]">
                      <Icon name="panorama" className="h-[15px] w-[15px] text-[#934a2d]" />
                      Window & Skyline Seating
                    </div>

                    <span className="hidden rounded bg-[#f0edec] px-2 py-0.5 text-[9px] uppercase sm:inline">
                      Live Preview
                    </span>
                  </div>

                  <div className="mt-3 grid h-[calc(100%-3rem)] grid-cols-6 grid-rows-4 gap-2 sm:gap-3">
                    {visibleFloorTables.map((table) => {
                      const selected = selectedTableId === table.id;

                      const isUnavailable =
                        table.status === "occupied" ||
                        table.status === "reserved";

                      return (
                        <button
                          key={table.id}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => {
                            setSelectedTableId(table.id);
                          }}
                          className={[
                            table.type === "booth"
                              ? "col-span-2 row-span-2"
                              : table.type === "mesob"
                                ? "col-span-2 row-span-2"
                                : "col-span-2 row-span-2",
                            "rounded-2xl p-3 text-left transition",
                            selected
                              ? "bg-[#01261f] text-white ring-4 ring-[#ffe088] shadow-xl"
                              : table.status === "available"
                                ? "bg-white text-[#01261f] border-2 border-[#43655c] hover:scale-[1.02]"
                                : table.status === "reserved"
                                  ? "bg-[#ffdbcf] text-[#380d00]"
                                  : "bg-[#e5e2e1] text-[#717976] opacity-70",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              Table {table.number}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                selected
                                  ? "bg-[#c5eadf] text-[#00201a]"
                                  : table.status === "available"
                                    ? "bg-[#c5eadf] text-[#00201a]"
                                    : table.status === "reserved"
                                      ? "bg-[#934a2d] text-white"
                                      : "bg-[#dcd9d9] text-[#717976]"
                              }`}
                            >
                              {selected ? "Selected" : table.status}
                            </span>
                          </div>

                          <div className="my-3">
                            <div
                              className={`font-serif text-sm font-bold ${
                                selected ? "text-[#ffe088]" : ""
                              }`}
                            >
                              {table.title}
                            </div>

                            <div
                              className={`mt-1 text-[10px] ${
                                selected
                                  ? "text-white/70"
                                  : "text-[#717976]"
                              }`}
                            >
                              {table.capacity}
                            </div>
                          </div>

                          <div
                            className={`border-t pt-2 text-[9px] ${
                              selected
                                ? "border-white/20 text-[#c5eadf]"
                                : "border-[#c1c8c4]/40 text-[#717976]"
                            }`}
                          >
                            {table.seating}
                          </div>
                        </button>
                      );
                    })}

                    <div className="col-span-2 row-span-2 flex flex-col items-center justify-center rounded-2xl border border-[#cba72f]/40 bg-[#cba72f]/10 p-2 text-center">
                      <Icon name="local_cafe" className="h-6 w-6 animate-pulse  text-[#735c00]" />

                      <span className="mt-1 font-serif text-xs font-bold text-[#4e3d00]">
                        Heritage Buna
                      </span>

                      <span className="mt-1 text-[9px] text-[#717976]">
                        Cultural experience
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#43655c]" />
                    Available
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#01261f] ring-2 ring-[#ffe088]" />
                    Selected
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#934a2d]" />
                    Reserved
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#c1c8c4]" />
                    Occupied
                  </span>
                </div>
              </div>

              {/* TABLE DETAILS */}
              <div className="flex flex-col justify-between gap-6 bg-white p-4 sm:p-6 lg:col-span-5">
                <div>
                  <div className="relative h-44 overflow-hidden rounded-2xl">
                    <img
                      src={HERO_IMAGE}
                      alt="Restaurant dining interior"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#01261f]/80 to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <div className="text-xs font-semibold text-[#ffe088]">
                          {selectedTable.status === "available"
                            ? "Available Seating"
                            : selectedTable.status}
                        </div>

                        <h3 className="font-serif text-xl font-bold">
                          Table {selectedTable.number}
                        </h3>
                      </div>

                      <span className="rounded bg-[#01261f] px-2 py-1 text-xs font-bold">
                        {selectedTable.capacity}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-5 font-serif text-2xl font-bold text-[#01261f]">
                    {selectedTable.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#717976]">
                    {selectedTable.description}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-[#f6f3f2] p-3">
                      <span className="block text-[10px] font-bold uppercase text-[#717976]">
                        Seating
                      </span>

                      <span className="mt-1 block text-xs font-semibold text-[#01261f]">
                        {selectedTable.seating}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#f6f3f2] p-3">
                      <span className="block text-[10px] font-bold uppercase text-[#717976]">
                        Sound
                      </span>

                      <span className="mt-1 block text-xs font-semibold text-[#01261f]">
                        {selectedTable.sound}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#f6f3f2] p-3">
                      <span className="block text-[10px] font-bold uppercase text-[#717976]">
                        Lighting
                      </span>

                      <span className="mt-1 block text-xs font-semibold text-[#01261f]">
                        {selectedTable.lighting}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#f6f3f2] p-3">
                      <span className="block text-[10px] font-bold uppercase text-[#717976]">
                        Dietary
                      </span>

                      <span className="mt-1 block text-xs font-semibold text-[#01261f]">
                        {selectedTable.dietary}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#c1c8c4]/30 pt-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-[#717976]">
                        Holding Deposit
                      </span>

                      <span className="font-serif text-2xl font-bold text-[#01261f]">
                        {selectedTable.deposit.toLocaleString()} ETB
                      </span>

                      <span className="ml-1 text-[10px] text-[#717976]">
                        when applicable
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-xs font-semibold text-[#43655c]">
                      <Icon name="verified" className="h-[15px] w-[15px]" />
                      Reservation Ready
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={selectedTable.status !== "available"}
                      onClick={() => {
                        setModalOpen(false);

                        const restaurant = restaurants[0];

                        if (!restaurant) return;

                        const params = new URLSearchParams({
                          date: reservationDate,
                          time: reservationTime,
                          party_size: String(partySize),
                          table_id: String(selectedTable.id),
                        });

                        router.push(
                          `/restaurants/${restaurant.id}/reserve?${params.toString()}`
                        );
                      }}
                      className="flex-1 rounded-xl bg-[#01261f] py-3 text-sm font-bold text-white transition hover:bg-[#1a3c34] disabled:cursor-not-allowed disabled:bg-[#c1c8c4]"
                    >
                      {selectedTable.status === "available"
                        ? "Continue Reservation"
                        : "Unavailable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="rounded-xl border border-[#934a2d] px-4 text-sm font-semibold text-[#934a2d] transition hover:bg-[#fff7f3]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}