"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";

type Restaurant = {
  id: number;
  name: string;
  description?: string | null;
  cuisine_type?: string | null;
  price_range?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: unknown;
  photos?: unknown;
  is_active?: boolean;
  active?: boolean;
  approved?: boolean | string;
  created_at?: string;
  updated_at?: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  restaurant_id?: number | null;
  is_active?: boolean;
  created_at?: string;
};

type Reservation = {
  id: number;
  user_id?: number;
  restaurant_id?: number;
  customer?: User | null;
  user?: User | null;
  restaurant?: Restaurant | null;
  reservation_date?: string;
  date?: string;
  time?: string;
  reservation_time?: string;
  party_size?: number;
  guests?: number;
  status?: string;
  table?: {
    id?: number;
    table_number?: string | number;
    name?: string;
  } | null;
  table_number?: string | number | null;
  photos?: string | string[] | null;
  is_active?: boolean | number | string;
  approved?: boolean | number | string;
  created_at?: string;
  updated_at?: string;
};

interface LaravelPagination<T> {
  current_page: number;
  data: T[];
  first_page_url?: string | null;
  from?: number | null;
  last_page: number;
  last_page_url?: string | null;
  links?: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number | null;
  total: number;
}

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000/api";

const getToken = () => {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token")
  );
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const error = await response.json();

      if (error?.message) {
        message = error.message;
      }
    } catch {
      // Ignore invalid JSON error responses.
    }

    throw new Error(message);
  }

  return response.json();
}

function unwrapData<T>(response: ApiResponse<T>): T {
  return response.data as T;
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

const isApproved = (
  value: string | boolean | number | undefined | null,
): boolean => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "approved"
  );
};

const isActive = (
  value: string | boolean | number | undefined | null,
): boolean => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "active"
  );
};

function isRestaurantApproved(restaurant: Restaurant) {
  return (
    restaurant.approved === true ||
    restaurant.approved === "approved" ||
    isApproved(restaurant.approved)
  );
}

function isRestaurantActive(restaurant: Restaurant) {
  return (
    restaurant.is_active === true ||
    restaurant.active === true ||
    isActive(restaurant.is_active)
  );
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value;
}

function getReservationCustomer(reservation: Reservation) {
  return (
    reservation.customer?.name ||
    reservation.user?.name ||
    `Guest #${reservation.user_id ?? "—"}`
  );
}

function getReservationRestaurant(
  reservation: Reservation,
  restaurants: Restaurant[],
) {
  if (reservation.restaurant?.name) {
    return reservation.restaurant.name;
  }

  const restaurant = restaurants.find(
    (item) => item.id === reservation.restaurant_id,
  );

  return restaurant?.name || "—";
}

function getReservationTime(reservation: Reservation) {
  return formatTime(
    reservation.time ||
      reservation.reservation_time ||
      reservation.reservation_date,
  );
}

function getReservationGuests(reservation: Reservation) {
  return reservation.party_size ?? reservation.guests ?? "—";
}

function getReservationTable(reservation: Reservation) {
  if (reservation.table?.table_number !== undefined) {
    return `T-${reservation.table.table_number}`;
  }

  if (reservation.table?.name) {
    return reservation.table.name;
  }

  return reservation.table_number
    ? String(reservation.table_number)
    : "Unassigned";
}

function statusClasses(status?: string) {
  const value = (status || "").toLowerCase();

  if (
    value.includes("confirm") ||
    value.includes("complete") ||
    value.includes("seated")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value.includes("pending")) {
    return "bg-amber-50 text-amber-700";
  }

  if (value.includes("cancel") || value.includes("reject")) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
        status,
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent = "emerald",
}: {
  title: string;
  value: number | string;
  description: string;
  icon: string;
  accent?: "emerald" | "amber" | "slate" | "blue";
}) {
  const styles = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      line: "bg-emerald-600",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      line: "bg-amber-500",
    },
    slate: {
      icon: "bg-slate-100 text-slate-700",
      line: "bg-slate-400",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      line: "bg-blue-500",
    },
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {title}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles[accent].icon}`}
        >
          <span className="material-symbols-outlined text-[19px]">
            {icon}
          </span>
        </div>
      </div>

      <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      <div className="mt-1 text-sm text-slate-500">{description}</div>

      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles[accent].line}`}
      />
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-9 w-20 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [pagination, setPagination] =
    useState<LaravelPagination<Restaurant> | null>(null);

  const [loading, setLoading] = useState(true);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const restaurantResponse = await apiFetch<ApiResponse<unknown>>(
        "/restaurants",
      );

      const rawRestaurantData = unwrapData(restaurantResponse);

      let restaurantData: Restaurant[] = [];

      if (
        rawRestaurantData &&
        typeof rawRestaurantData === "object" &&
        !Array.isArray(rawRestaurantData) &&
        "data" in rawRestaurantData
      ) {
        const paginationData =
          rawRestaurantData as LaravelPagination<Restaurant>;

        setPagination(paginationData);
        restaurantData = normalizeArray<Restaurant>(paginationData.data);
      } else {
        restaurantData = normalizeArray<Restaurant>(rawRestaurantData);
        setPagination(null);
      }

      setRestaurants(restaurantData);

      /*
       * Users are optional.
       */
      try {
        const userResponse = await apiFetch<ApiResponse<unknown>>(
          "/admin/users",
        );

        setUsers(normalizeArray<User>(unwrapData(userResponse)));
      } catch {
        setUsers([]);
      }

      /*
       * Load reservations from each restaurant.
       */
      setReservationLoading(true);

      const reservationResults = await Promise.allSettled(
        restaurantData.map(async (restaurant) => {
          const response = await apiFetch<ApiResponse<unknown>>(
            `/restaurants/${restaurant.id}/reservations`,
          );

          const data = normalizeArray<Reservation>(
            unwrapData(response),
          );

          return data.map((reservation) => ({
            ...reservation,
            restaurant:
              reservation.restaurant || restaurant,
            restaurant_id:
              reservation.restaurant_id ?? restaurant.id,
          }));
        }),
      );

      const allReservations: Reservation[] = [];

      reservationResults.forEach((result) => {
        if (result.status === "fulfilled") {
          allReservations.push(...result.value);
        }
      });

      const uniqueReservations = Array.from(
        new Map(
          allReservations.map((reservation) => [
            reservation.id,
            reservation,
          ]),
        ).values(),
      );

      uniqueReservations.sort((a, b) => {
        const aDate = new Date(
          a.reservation_date || a.created_at || "",
        ).getTime();

        const bDate = new Date(
          b.reservation_date || b.created_at || "",
        ).getTime();

        return bDate - aDate;
      });

      setReservations(uniqueReservations);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setReservationLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    loadDashboard();
  }, [loadDashboard, router]);

  const activeRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          isRestaurantActive(restaurant) &&
          isRestaurantApproved(restaurant),
      ),
    [restaurants],
  );

  const pendingRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          !isRestaurantApproved(restaurant) ||
          !isRestaurantActive(restaurant),
      ),
    [restaurants],
  );

  const staffCount = useMemo(
    () =>
      users.filter(
        (user) => user.role?.toLowerCase() === "staff",
      ).length,
    [users],
  );

  const today = new Date();

  const todaysReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const value =
        reservation.reservation_date || reservation.created_at;

      if (!value) return false;

      const date = new Date(value);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }, [reservations, today]);

  const confirmedReservations = useMemo(
    () =>
      todaysReservations.filter((reservation) =>
        ["confirmed", "confirm"].includes(
          (reservation.status || "").toLowerCase(),
        ),
      ).length,
    [todaysReservations],
  );

  const pendingReservations = useMemo(
    () =>
      todaysReservations.filter((reservation) =>
        (reservation.status || "")
          .toLowerCase()
          .includes("pending"),
      ).length,
    [todaysReservations],
  );

  const seatedReservations = useMemo(
    () =>
      todaysReservations.filter((reservation) =>
        (reservation.status || "")
          .toLowerCase()
          .includes("seated"),
      ).length,
    [todaysReservations],
  );

  const cancelledReservations = useMemo(
    () =>
      todaysReservations.filter((reservation) =>
        (reservation.status || "")
          .toLowerCase()
          .includes("cancel"),
      ).length,
    [todaysReservations],
  );

  const filteredReservations = useMemo(() => {
    const query = reservationSearch.trim().toLowerCase();

    if (!query) {
      return reservations.slice(0, 10);
    }

    return reservations
      .filter((reservation) => {
        const restaurant = getReservationRestaurant(
          reservation,
          restaurants,
        );

        const customer = getReservationCustomer(reservation);

        return `${reservation.id} ${customer} ${restaurant} ${
          reservation.status || ""
        }`
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 10);
  }, [reservationSearch, reservations, restaurants]);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.city || ""} ${
        restaurant.cuisine_type || ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [restaurants, search]);

  const stats = useMemo(() => {
    const total = pagination?.total ?? restaurants.length;

    const active = restaurants.filter((restaurant) =>
      isRestaurantActive(restaurant),
    ).length;

    const inactive = restaurants.filter(
      (restaurant) => !isRestaurantActive(restaurant),
    ).length;

    const approved = restaurants.filter((restaurant) =>
      isRestaurantApproved(restaurant),
    ).length;

    const pending = restaurants.filter(
      (restaurant) => !isRestaurantApproved(restaurant),
    ).length;

    return {
      total,
      active,
      inactive,
      approved,
      pending,
    };
  }, [restaurants, pagination]);

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const exportReport = () => {
    const rows = [
      [
        "Reservation ID",
        "Customer",
        "Restaurant",
        "Date",
        "Time",
        "Guests",
        "Status",
      ],
      ...reservations.map((reservation) => [
        String(reservation.id),
        getReservationCustomer(reservation),
        getReservationRestaurant(reservation, restaurants),
        reservation.reservation_date || "",
        getReservationTime(reservation),
        String(getReservationGuests(reservation)),
        reservation.status || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `reserveease-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Shared admin sidebar */}
      <AdminSidebar />

      {/* Main */}
      <div className="lg:pl-25">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400">
                search
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search restaurants..."
                className="h-9 w-72 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 xl:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
              API: Online
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-[20px]">
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/admin/restaurants/create")
              }
              className="hidden h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex"
            >
              <span className="material-symbols-outlined text-[17px]">
                add
              </span>
              Add Restaurant
            </button>

            <div className="mx-1 h-6 w-px bg-slate-200" />

            <button
              type="button"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>

              {pendingRestaurants.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
              <span className="material-symbols-outlined text-[18px]">
                person
              </span>
            </div>
          </div>
        </header>

        <main className="min-h-screen p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1800px] space-y-7">
            {/* Page heading */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  HQ Command Deck

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />

                  <span className="text-slate-500">
                    Live Synchronized
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Welcome back, Admin
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Here is what is happening across the
                  ReserveEase platform today.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm">
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">
                    calendar_month
                  </span>

                  {currentDate}
                </div>

                <button
                  type="button"
                  onClick={exportReport}
                  className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    download
                  </span>

                  Export
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">
                    error
                  </span>

                  <div>
                    <div className="font-semibold">
                      Unable to load dashboard data
                    </div>

                    <div className="text-sm">{error}</div>
                  </div>
                </div>

                <button
                  onClick={loadDashboard}
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Stats */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {loading ? (
                <>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <LoadingCard key={index} />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Restaurants"
                    value={activeRestaurants.length}
                    description="Active approved venues"
                    icon="storefront"
                    accent="emerald"
                  />

                  <StatCard
                    title="Approvals"
                    value={pendingRestaurants.length}
                    description="Restaurants requiring review"
                    icon="hourglass_top"
                    accent="amber"
                  />

                  <StatCard
                    title="Total Users"
                    value={users.length}
                    description={
                      users.length
                        ? "Users returned by admin API"
                        : "User API unavailable"
                    }
                    icon="groups"
                    accent="slate"
                  />

                  <StatCard
                    title="Floor Staff"
                    value={staffCount}
                    description="Staff users"
                    icon="badge"
                    accent="emerald"
                  />

                  <StatCard
                    title="Today's Bookings"
                    value={todaysReservations.length}
                    description={`${todaysReservations.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          getReservationGuests(item) || 0,
                        ),
                      0,
                    )} total covers`}
                    icon="confirmation_number"
                    accent="blue"
                  />

                  <StatCard
                    title="Lifetime Total"
                    value={reservations.length}
                    description="Reservations currently loaded"
                    icon="history"
                    accent="slate"
                  />
                </>
              )}
            </section>

            {/* Main content */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
              <div className="space-y-6 xl:col-span-7">
                {/* Reservation flow */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col justify-between gap-3 pb-5 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Operational Cadence
                      </div>

                      <h2 className="mt-1 text-lg font-bold text-slate-900">
                        Today&apos;s Reservation Flow
                      </h2>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {todaysReservations.length} reservations
                      today
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                    <FlowMetric
                      label="Seated"
                      value={seatedReservations}
                      color="emerald"
                    />

                    <FlowMetric
                      label="Confirmed"
                      value={confirmedReservations}
                      color="blue"
                    />

                    <FlowMetric
                      label="Pending"
                      value={pendingReservations}
                      color="amber"
                    />

                    <FlowMetric
                      label="Cancelled"
                      value={cancelledReservations}
                      color="red"
                    />
                  </div>

                  <div className="mt-5">
                    {todaysReservations.length === 0 ? (
                      <EmptyState
                        icon="event_busy"
                        title="No reservations for today"
                        description="There are no reservations returned by the API for today."
                      />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <FlowBlock
                          title="Confirmed"
                          value={confirmedReservations}
                          total={todaysReservations.length}
                          icon="wb_sunny"
                        />

                        <FlowBlock
                          title="Pending"
                          value={pendingReservations}
                          total={todaysReservations.length}
                          icon="schedule"
                        />

                        <FlowBlock
                          title="Seated"
                          value={seatedReservations}
                          total={todaysReservations.length}
                          icon="table_restaurant"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Restaurant attention */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col justify-between gap-3 pb-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <span className="material-symbols-outlined text-[19px]">
                          priority_high
                        </span>
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Restaurants Requiring Attention
                        </h2>

                        <p className="text-sm text-slate-500">
                          Restaurants not currently active and
                          approved.
                        </p>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {pendingRestaurants.length} pending
                    </span>
                  </div>

                  {pendingRestaurants.length === 0 ? (
                    <EmptyState
                      icon="check_circle"
                      title="No restaurants require attention"
                      description="All restaurants currently returned by the API are active and approved."
                    />
                  ) : (
                    <div className="space-y-3">
                      {pendingRestaurants
                        .slice(0, 6)
                        .map((restaurant) => (
                          <div
                            key={restaurant.id}
                            className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-white md:flex-row md:items-center"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                                <span className="material-symbols-outlined">
                                  storefront
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {restaurant.name}
                                  </span>

                                  {restaurant.city && (
                                    <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-500">
                                      {restaurant.city}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 text-sm text-slate-500">
                                  {restaurant.cuisine_type ||
                                    "Cuisine not specified"}
                                </div>

                                <div className="mt-1 text-xs font-medium text-amber-700">
                                  {!isRestaurantApproved(
                                    restaurant,
                                  )
                                    ? "Approval required"
                                    : "Restaurant inactive"}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRestaurant(
                                  restaurant,
                                )
                              }
                              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              Review

                              <span className="material-symbols-outlined text-[15px]">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {/* Recent reservations */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col justify-between gap-3 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Recent Platform Reservations
                      </h2>

                      <p className="text-sm text-slate-500">
                        Reservations returned from your restaurants.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-slate-400">
                          search
                        </span>

                        <input
                          value={reservationSearch}
                          onChange={(event) =>
                            setReservationSearch(
                              event.target.value,
                            )
                          }
                          placeholder="Filter..."
                          className="h-8 w-36 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs outline-none focus:border-emerald-500 sm:w-44"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push("/admin/reservations")
                        }
                        className="hidden h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 sm:flex"
                      >
                        View All

                        <span className="material-symbols-outlined text-[14px]">
                          open_in_new
                        </span>
                      </button>
                    </div>
                  </div>

                  {reservationLoading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                      <span className="mr-2 material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      Loading reservations...
                    </div>
                  ) : filteredReservations.length === 0 ? (
                    <EmptyState
                      icon="event_busy"
                      title="No reservations found"
                      description="No reservation records were returned by the API."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-187.5 text-left">
                        <thead>
                          <tr className="rounded-lg bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Diner</th>
                            <th className="px-4 py-3">
                              Restaurant
                            </th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Guests</th>
                            <th className="px-4 py-3">Table</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredReservations.map(
                            (reservation) => (
                              <tr
                                key={reservation.id}
                                className="transition hover:bg-slate-50"
                              >
                                <td className="px-4 py-3 font-mono text-sm font-semibold text-emerald-700">
                                  #{reservation.id}
                                </td>

                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                  {getReservationCustomer(
                                    reservation,
                                  )}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-500">
                                  {getReservationRestaurant(
                                    reservation,
                                    restaurants,
                                  )}
                                </td>

                                <td className="px-4 py-3 font-mono text-sm text-slate-700">
                                  {getReservationTime(
                                    reservation,
                                  )}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {getReservationGuests(
                                    reservation,
                                  )}
                                </td>

                                <td className="px-4 py-3 font-mono text-sm text-slate-500">
                                  {getReservationTable(
                                    reservation,
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <StatusBadge
                                    status={reservation.status}
                                  />
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              {/* Right column */}
              <div className="space-y-6 xl:col-span-3">
                {/* Pending spotlight */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[19px] text-amber-600">
                        verified
                      </span>

                      <h3 className="font-bold text-slate-900">
                        Pending Spotlight
                      </h3>
                    </div>

                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                      {pendingRestaurants.length}
                    </span>
                  </div>

                  {pendingRestaurants.length === 0 ? (
                    <EmptyState
                      icon="check_circle"
                      title="Nothing pending"
                      description="There are no restaurants awaiting attention."
                    />
                  ) : (
                    <div>
                      <div className="mb-4 rounded-xl bg-slate-100 p-4">
                        <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                          <span className="material-symbols-outlined text-3xl">
                            storefront
                          </span>
                        </div>

                        <h4 className="font-semibold text-slate-900">
                          {pendingRestaurants[0].name}
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          {pendingRestaurants[0].cuisine_type ||
                            "Restaurant"}
                          {pendingRestaurants[0].city
                            ? ` • ${pendingRestaurants[0].city}`
                            : ""}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Address
                          </span>

                          <span className="max-w-[55%] truncate font-medium text-slate-900">
                            {pendingRestaurants[0].address || "—"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Phone
                          </span>

                          <span className="font-medium text-slate-900">
                            {pendingRestaurants[0].phone || "—"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Approval
                          </span>

                          <span className="font-semibold text-amber-700">
                            {!isRestaurantApproved(
                              pendingRestaurants[0],
                            )
                              ? "Pending"
                              : "Approved"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRestaurant(
                            pendingRestaurants[0],
                          )
                        }
                        className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Review Restaurant

                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Live activity */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[19px] text-emerald-600">
                        dynamic_feed
                      </span>

                      <h3 className="font-bold text-slate-900">
                        Live Activity
                      </h3>
                    </div>

                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredReservations
                      .slice(0, 5)
                      .map((reservation) => (
                        <div
                          key={`activity-${reservation.id}`}
                          className="flex gap-3 py-3"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <span className="material-symbols-outlined text-[15px]">
                              event
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm text-slate-700">
                              Reservation{" "}
                              <span className="font-mono font-semibold text-emerald-700">
                                #{reservation.id}
                              </span>{" "}
                              at{" "}
                              <span className="font-medium text-slate-900">
                                {getReservationRestaurant(
                                  reservation,
                                  restaurants,
                                )}
                              </span>
                            </p>

                            <span className="text-xs text-slate-400">
                              {getReservationGuests(
                                reservation,
                              )}{" "}
                              guests
                            </span>
                          </div>
                        </div>
                      ))}

                    {filteredReservations.length === 0 && (
                      <div className="py-6 text-center text-sm text-slate-500">
                        No activity available.
                      </div>
                    )}
                  </div>
                </section>

                {/* System health */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[19px] text-emerald-600">
                        dns
                      </span>

                      <h3 className="font-bold text-slate-900">
                        System & API Health
                      </h3>
                    </div>

                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Connected
                    </span>
                  </div>

                  <div className="space-y-3">
                    <HealthRow
                      name="Laravel API"
                      description={API_BASE}
                      status="Connected"
                    />

                    <HealthRow
                      name="Restaurants API"
                      description={`${restaurants.length} records loaded`}
                      status="OK"
                    />

                    <HealthRow
                      name="Reservations API"
                      description={`${reservations.length} records loaded`}
                      status="OK"
                    />

                    <HealthRow
                      name="Users API"
                      description={
                        users.length
                          ? `${users.length} users loaded`
                          : "Endpoint unavailable"
                      }
                      status={users.length ? "OK" : "N/A"}
                    />
                  </div>
                </section>

                {/* Restaurant search results */}
                {search && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">
                        Restaurant Search
                      </h3>

                      <span className="text-xs text-slate-500">
                        {filteredRestaurants.length} results
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredRestaurants
                        .slice(0, 5)
                        .map((restaurant) => (
                          <button
                            key={restaurant.id}
                            type="button"
                            onClick={() =>
                              setSelectedRestaurant(
                                restaurant,
                              )
                            }
                            className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left hover:bg-slate-100"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {restaurant.name}
                              </div>

                              <div className="truncate text-xs text-slate-500">
                                {restaurant.city ||
                                  restaurant.address ||
                                  "Location unavailable"}
                              </div>
                            </div>

                            <span className="material-symbols-outlined text-[18px] text-slate-400">
                              chevron_right
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Restaurant review modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="material-symbols-outlined">
                    assignment_turned_in
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    {selectedRestaurant.name}
                  </h3>

                  <p className="text-sm text-slate-500">
                    Restaurant details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRestaurant(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
              <DetailRow
                label="Cuisine"
                value={selectedRestaurant.cuisine_type || "—"}
              />

              <DetailRow
                label="Address"
                value={
                  [
                    selectedRestaurant.address,
                    selectedRestaurant.city,
                    selectedRestaurant.state,
                    selectedRestaurant.zip,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />

              <DetailRow
                label="Phone"
                value={selectedRestaurant.phone || "—"}
              />

              <DetailRow
                label="Email"
                value={selectedRestaurant.email || "—"}
              />

              <DetailRow
                label="Created"
                value={formatDate(selectedRestaurant.created_at)}
              />

              <DetailRow
                label="Active"
                value={
                  isRestaurantActive(selectedRestaurant)
                    ? "Yes"
                    : "No"
                }
              />

              <DetailRow
                label="Approved"
                value={
                  isRestaurantApproved(selectedRestaurant)
                    ? "Yes"
                    : "No"
                }
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRestaurant(null)}
                className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const restaurantId =
                    selectedRestaurant.id;

                  setSelectedRestaurant(null);

                  router.push(
                    `/admin/restaurants/${restaurantId}`,
                  );
                }}
                className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Open Restaurant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small reusable components                                                  */
/* -------------------------------------------------------------------------- */

function FlowMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "blue" | "amber" | "red";
}) {
  const colors = {
    emerald: "bg-emerald-600",
    blue: "bg-blue-600",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-2.5 w-2.5 rounded-full ${colors[color]}`}
      />

      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className="text-lg font-bold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function FlowBlock({
  title,
  value,
  total,
  icon,
}: {
  title: string;
  value: number;
  total: number;
  icon: string;
}) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">
            {icon}
          </span>

          <span className="text-sm font-semibold text-slate-900">
            {title}
          </span>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {percentage}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {value} of {total}
      </div>
    </div>
  );
}

function HealthRow({
  name,
  description,
  status,
}: {
  name: string;
  description: string;
  status: string;
}) {
  const ok = status === "OK" || status === "Connected";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            ok ? "bg-emerald-600" : "bg-slate-400"
          }`}
        />

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            {name}
          </div>

          <div className="truncate text-xs text-slate-500">
            {description}
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 text-xs font-semibold ${
          ok ? "text-emerald-700" : "text-slate-500"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="max-w-[60%] text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <span className="material-symbols-outlined">
          {icon}
        </span>
      </div>

      <div className="mt-3 font-semibold text-slate-900">
        {title}
      </div>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}