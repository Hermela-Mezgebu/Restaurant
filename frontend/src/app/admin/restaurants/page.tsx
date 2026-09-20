"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiActivity,
  FiAlertCircle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiFilter,
  FiHome,
  FiMapPin,
  FiMenu,
  FiMoreVertical,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import { apiFetch } from "@/lib/api";
import AdminSidebar from "@/components/admin/AdminSidebar";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Restaurant {
  id: number;
  name: string;
  description?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: unknown;
  photos?: unknown;
  is_active?: boolean;
  approved?: boolean;
  created_at?: string;
  updated_at?: string;
}

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

interface RestaurantApiResponse {
  success?: boolean;
  message?: string;
  data: LaravelPagination<Restaurant>;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCuisine(value?: string | null) {
  if (!value) return "Not specified";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPriceRange(value?: string | null) {
  if (!value) return "—";
  return value;
}

function getRestaurantLocation(restaurant: Restaurant) {
  const parts = [
    restaurant.address,
    restaurant.city,
    restaurant.state,
    restaurant.zip,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Location not provided";
}

function getRestaurantImage(restaurant: Restaurant): string | null {
  const photos = restaurant.photos;

  if (!photos) return null;

  if (typeof photos === "string") {
    try {
      const parsed = JSON.parse(photos);

      if (Array.isArray(parsed)) {
        const first = parsed[0];

        if (typeof first === "string") {
          return first;
        }

        if (first && typeof first === "object") {
          return (
            (first as { url?: string; path?: string }).url ??
            (first as { url?: string; path?: string }).path ??
            null
          );
        }
      }

      if (typeof parsed === "string") {
        return parsed;
      }
    } catch {
      return photos;
    }
  }

  if (Array.isArray(photos)) {
    const first = photos[0];

    if (typeof first === "string") {
      return first;
    }

    if (first && typeof first === "object") {
      return (
        (first as { url?: string; path?: string }).url ??
        (first as { url?: string; path?: string }).path ??
        null
      );
    }
  }

  return null;
}

function normalizeImageUrl(value: string | null) {
  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/storage/")) {
    return value;
  }

  if (value.startsWith("storage/")) {
    return `/${value}`;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/storage/${value}`;
}

/* -------------------------------------------------------------------------- */
/* Small UI components                                                        */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  active,
}: {
  active?: boolean;
}) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-600">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-500" />
      Inactive
    </span>
  );
}

function ApprovalBadge({
  approved,
}: {
  approved?: boolean;
}) {
  if (approved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
        <FiCheckCircle className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      <FiAlertCircle className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

function RestaurantImage({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const image = normalizeImageUrl(
    getRestaurantImage(restaurant)
  );

  if (image) {
    return (
      <img
        src={image}
        alt={restaurant.name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
      <FiHome className="h-5 w-5" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-stone-100">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-stone-200" />

          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
      </td>

      <td className="px-4 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-100" />
      </td>

      <td className="px-4 py-4">
        <div className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
      </td>

      <td className="px-4 py-4">
        <div className="h-6 w-20 animate-pulse rounded-full bg-stone-100" />
      </td>

      <td className="px-4 py-4">
        <div className="h-6 w-20 animate-pulse rounded-full bg-stone-100" />
      </td>

      <td className="px-4 py-4">
        <div className="ml-auto h-8 w-20 animate-pulse rounded-lg bg-stone-100" />
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch =
    searchParams.get("search") ?? "";

  const initialCuisine =
    searchParams.get("cuisine") ?? "";

  const initialStatus =
    searchParams.get("status") ?? "";

  const initialApproval =
    searchParams.get("approval") ?? "";

  const initialPage =
    Number(searchParams.get("page") ?? "1");

  const [restaurants, setRestaurants] =
    useState<Restaurant[]>([]);

  const [pagination, setPagination] =
    useState<LaravelPagination<Restaurant> | null>(null);

  const [search, setSearch] =
    useState(initialSearch);

  const [cuisine, setCuisine] =
    useState(initialCuisine);

  const [status, setStatus] =
    useState(initialStatus);

  const [approval, setApproval] =
    useState(initialApproval);

  const [page, setPage] = useState(
    Number.isFinite(initialPage) && initialPage > 0
      ? initialPage
      : 1
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const [mobileHeaderOpen, setMobileHeaderOpen] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* Fetch backend data                                                     */
  /* ---------------------------------------------------------------------- */

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set(
        "per_page",
        String(ITEMS_PER_PAGE)
      );

      params.set(
        "page",
        String(page)
      );

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (cuisine) {
        params.set(
          "cuisine",
          cuisine
        );
      }

      /*
       * The existing public restaurant endpoint
       * currently returns active + approved records.
       *
       * Status and approval are therefore filtered
       * client-side against the returned records.
       *
       * If a dedicated admin restaurant endpoint is
       * added later, those filters can be sent there.
       */

      const response =
        await apiFetch<RestaurantApiResponse>(
          `/restaurants?${params.toString()}`
        );

      if (!response?.data) {
        throw new Error(
          "The backend returned an invalid restaurant response."
        );
      }

      setRestaurants(
        response.data.data ?? []
      );

      setPagination(
        response.data
      );
    } catch (err) {
      console.error(
        "Failed to load restaurants:",
        err
      );

      setRestaurants([]);
      setPagination(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load restaurants from the backend."
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    cuisine,
  ]);

  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  /* ---------------------------------------------------------------------- */
  /* URL synchronization                                                    */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (cuisine) {
      params.set(
        "cuisine",
        cuisine
      );
    }

    if (status) {
      params.set(
        "status",
        status
      );
    }

    if (approval) {
      params.set(
        "approval",
        approval
      );
    }

    if (page > 1) {
      params.set(
        "page",
        String(page)
      );
    }

    const query =
      params.toString();

    router.replace(
      query
        ? `/admin/restaurants?${query}`
        : "/admin/restaurants",
      {
        scroll: false,
      }
    );
  }, [
    search,
    cuisine,
    status,
    approval,
    page,
    router,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Filtering                                                              */
  /* ---------------------------------------------------------------------- */

  const visibleRestaurants =
    useMemo(() => {
      return restaurants.filter(
        (restaurant) => {
          if (
            status === "active" &&
            !restaurant.is_active
          ) {
            return false;
          }

          if (
            status === "inactive" &&
            restaurant.is_active
          ) {
            return false;
          }

          if (
            approval === "approved" &&
            !restaurant.approved
          ) {
            return false;
          }

          if (
            approval === "pending" &&
            restaurant.approved
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      restaurants,
      status,
      approval,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                             */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const total =
      pagination?.total ??
      restaurants.length;

    const active =
      restaurants.filter(
        (restaurant) =>
          restaurant.is_active
      ).length;

    const inactive =
      restaurants.filter(
        (restaurant) =>
          !restaurant.is_active
      ).length;

    const approved =
      restaurants.filter(
        (restaurant) =>
          restaurant.approved
      ).length;

    const pending =
      restaurants.filter(
        (restaurant) =>
          !restaurant.approved
      ).length;

    return {
      total,
      active,
      inactive,
      approved,
      pending,
    };
  }, [
    restaurants,
    pagination,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  const clearFilters = () => {
    setSearch("");
    setCuisine("");
    setStatus("");
    setApproval("");
    setPage(1);
  };

  const changePage = (
    nextPage: number
  ) => {
    if (nextPage < 1) {
      return;
    }

    if (
      pagination &&
      nextPage > pagination.last_page
    ) {
      return;
    }

    setPage(nextPage);
  };

  const goToCreate = () => {
    router.push(
      "/admin/restaurants/create"
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Pagination                                                             */
  /* ---------------------------------------------------------------------- */

  const paginationNumbers =
    useMemo(() => {
      if (!pagination) {
        return [];
      }

      const lastPage =
        pagination.last_page;

      const currentPage =
        pagination.current_page;

      if (lastPage <= 7) {
        return Array.from(
          {
            length: lastPage,
          },
          (_, index) =>
            index + 1
        );
      }

      const pages: Array<
        number | "..."
      > = [1];

      if (currentPage > 3) {
        pages.push("...");
      }

      const start =
        Math.max(
          2,
          currentPage - 1
        );

      const end =
        Math.min(
          lastPage - 1,
          currentPage + 1
        );

      for (
        let index = start;
        index <= end;
        index++
      ) {
        pages.push(index);
      }

      if (
        currentPage <
        lastPage - 2
      ) {
        pages.push("...");
      }

      pages.push(lastPage);

      return pages;
    }, [pagination]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#29231d]">

      {/* ---------------------------------------------------------------- */}
      {/* Shared Admin Sidebar                                             */}
      {/* ---------------------------------------------------------------- */}

     <AdminSidebar />

      {/* ---------------------------------------------------------------- */}
      {/* Main content                                                       */}
      {/* ---------------------------------------------------------------- */}

      <div className="lg:pl-25">

        {/* Header */}

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200/80 bg-[#faf7f2]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setMobileHeaderOpen(
                  (value) => !value
                )
              }
              className="rounded-xl border border-stone-200 bg-white p-2 text-stone-700 shadow-sm lg:hidden"
              aria-label="Open admin navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>

            <div className="hidden w-80 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm md:flex">
              <FiSearch className="h-4 w-4 shrink-0 text-stone-400" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search restaurants..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              API Online
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                void fetchRestaurants()
              }
              className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              title="Refresh"
            >
              <FiRefreshCw
                className={[
                  "h-4 w-4",
                  loading
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />
            </button>

            <button
              type="button"
              className="relative rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 shadow-sm hover:bg-stone-50"
              title="Notifications"
            >
              <FiBell className="h-4 w-4" />

              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm">
              <FiUsers className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Mobile navigation hint */}

        {mobileHeaderOpen && (
          <div className="border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
            <p className="text-xs font-semibold text-stone-500">
              Use the AdminSidebar menu to navigate the
              administration area.
            </p>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">

          {/* ---------------------------------------------------------------- */}
          {/* Heading                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                <span>
                  Registry Management
                </span>

                <span>•</span>

                <span className="text-orange-600">
                  Live Properties
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#29231d]">
                Restaurants
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-stone-500">
                Manage restaurants registered on
                the ReserveEase platform using
                live data from your Laravel backend.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
              >
                <FiFilter className="h-4 w-4" />
                Clear Filters
              </button>

              <button
                type="button"
                onClick={goToCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Restaurant
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Mobile Search                                                     */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-5 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm md:hidden">

            <FiSearch className="h-4 w-4 shrink-0 text-stone-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );
                setPage(1);
              }}
              placeholder="Search restaurants..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* KPI cards                                                         */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    Total Venues
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#29231d]">
                    {loading
                      ? "—"
                      : stats.total}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <FiHome className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">

                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {stats.active} Active
                </span>

                <span className="text-stone-500">
                  {stats.inactive} Inactive
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    Active Restaurants
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#29231d]">
                    {loading
                      ? "—"
                      : stats.active}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FiCheckCircle className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
                Currently enabled on the platform
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    Approved
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#29231d]">
                    {loading
                      ? "—"
                      : stats.approved}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <FiShield className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
                Approved records returned by the API
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    Pending
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#29231d]">
                    {loading
                      ? "—"
                      : stats.pending}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FiAlertCircle className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
                Pending records in the current API response
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Main layout                                                       */}
          {/* ---------------------------------------------------------------- */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

            <div className="min-w-0 xl:col-span-8">

              {/* Filter bar */}

              <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

                  <div className="relative min-w-0 flex-1">

                    <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(
                          event.target.value
                        );
                        setPage(1);
                      }}
                      placeholder="Search by restaurant name, city, cuisine..."
                      className="w-full rounded-xl border border-stone-200 bg-[#faf7f2] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {/* Cuisine */}

                    <div className="relative">

                      <select
                        value={cuisine}
                        onChange={(event) => {
                          setCuisine(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="appearance-none rounded-xl border border-stone-200 bg-[#faf7f2] py-2.5 pl-3 pr-9 text-sm font-semibold text-stone-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">
                          Cuisine: All
                        </option>

                        <option value="ethiopian">
                          Ethiopian
                        </option>

                        <option value="italian">
                          Italian
                        </option>

                        <option value="japanese">
                          Japanese
                        </option>

                        <option value="indian">
                          Indian
                        </option>

                        <option value="asian">
                          Asian
                        </option>

                        <option value="french">
                          French
                        </option>

                        <option value="seafood">
                          Seafood
                        </option>
                      </select>

                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>

                    {/* Status */}

                    <div className="relative">

                      <select
                        value={status}
                        onChange={(event) => {
                          setStatus(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="appearance-none rounded-xl border border-stone-200 bg-[#faf7f2] py-2.5 pl-3 pr-9 text-sm font-semibold text-stone-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">
                          Status: All
                        </option>

                        <option value="active">
                          Active
                        </option>

                        <option value="inactive">
                          Inactive
                        </option>
                      </select>

                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>

                    {/* Approval */}

                    <div className="relative">

                      <select
                        value={approval}
                        onChange={(event) => {
                          setApproval(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="appearance-none rounded-xl border border-stone-200 bg-[#faf7f2] py-2.5 pl-3 pr-9 text-sm font-semibold text-stone-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">
                          Approval: All
                        </option>

                        <option value="approved">
                          Approved
                        </option>

                        <option value="pending">
                          Pending
                        </option>
                      </select>

                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">

                  <FiXCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div className="min-w-0 flex-1">

                    <p className="font-semibold">
                      Could not load restaurants
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void fetchRestaurants()
                    }
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Data table */}

              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1050px] text-left">

                    <thead>
                      <tr className="border-b border-stone-200 bg-[#faf7f2]">

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Restaurant
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Location
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Cuisine
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Price
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Status
                        </th>

                        <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Approval
                        </th>

                        <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {loading ? (
                        <>
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                        </>
                      ) : visibleRestaurants.length > 0 ? (
                        visibleRestaurants.map(
                          (restaurant) => (
                            <tr
                              key={restaurant.id}
                              onClick={() =>
                                setSelectedRestaurant(
                                  restaurant
                                )
                              }
                              className={[
                                "group cursor-pointer border-b border-stone-100 transition-colors",
                                selectedRestaurant?.id ===
                                restaurant.id
                                  ? "bg-orange-50/60"
                                  : "hover:bg-[#faf7f2]",
                              ].join(" ")}
                            >

                              {/* Restaurant */}

                              <td className="px-4 py-4">

                                <div className="flex min-w-0 items-center gap-3">

                                  <RestaurantImage
                                    restaurant={restaurant}
                                  />

                                  <div className="min-w-0">

                                    <div className="max-w-[220px] truncate text-sm font-bold text-[#29231d] transition group-hover:text-orange-700">
                                      {restaurant.name}
                                    </div>

                                    <div className="mt-0.5 max-w-[220px] truncate text-xs text-stone-500">
                                      {restaurant.description ||
                                        "No description provided"}
                                    </div>

                                  </div>
                                </div>
                              </td>

                              {/* Location */}

                              <td className="px-4 py-4">

                                <div className="flex max-w-[190px] items-start gap-1.5 text-xs text-stone-600">

                                  <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />

                                  <span className="line-clamp-2">
                                    {getRestaurantLocation(
                                      restaurant
                                    )}
                                  </span>
                                </div>
                              </td>

                              {/* Cuisine */}

                              <td className="px-4 py-4">

                                <span className="text-sm font-semibold text-stone-600">
                                  {formatCuisine(
                                    restaurant.cuisine_type
                                  )}
                                </span>
                              </td>

                              {/* Price */}

                              <td className="px-4 py-4">

                                <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                                  {formatPriceRange(
                                    restaurant.price_range
                                  )}
                                </span>
                              </td>

                              {/* Status */}

                              <td className="px-4 py-4">
                                <StatusBadge
                                  active={
                                    restaurant.is_active
                                  }
                                />
                              </td>

                              {/* Approval */}

                              <td className="px-4 py-4">
                                <ApprovalBadge
                                  approved={
                                    restaurant.approved
                                  }
                                />
                              </td>

                              {/* Actions */}

                              <td className="px-4 py-4">

                                <div
                                  className="flex items-center justify-end gap-1"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                >

                                  <Link
                                    href={`/admin/restaurants/${restaurant.id}`}
                                    title="View restaurant"
                                    className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-50"
                                  >
                                    <FiEye className="h-4 w-4" />
                                  </Link>

                                  <Link
                                    href={`/admin/restaurants/${restaurant.id}/edit`}
                                    title="Edit restaurant"
                                    className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                                  >
                                    <FiEdit3 className="h-4 w-4" />
                                  </Link>

                                  <button
                                    type="button"
                                    title="More options"
                                    className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                                  >
                                    <FiMoreVertical className="h-4 w-4" />
                                  </button>

                                </div>
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>

                          <td
                            colSpan={7}
                            className="px-6 py-16 text-center"
                          >

                            <div className="mx-auto flex max-w-sm flex-col items-center">

                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                                <FiHome className="h-6 w-6" />
                              </div>

                              <h3 className="mt-4 text-base font-bold text-[#29231d]">
                                No restaurants found
                              </h3>

                              <p className="mt-1 text-sm text-stone-500">
                                Try changing your search
                                or filters.
                              </p>

                              <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
                              >
                                Clear Filters
                              </button>

                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}

                {!loading &&
                  pagination &&
                  pagination.total > 0 && (
                    <div className="flex flex-col gap-3 border-t border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                      <p className="text-xs text-stone-500">

                        Showing{" "}

                        <strong className="text-stone-800">
                          {pagination.from ?? 0}
                        </strong>{" "}

                        to{" "}

                        <strong className="text-stone-800">
                          {pagination.to ?? 0}
                        </strong>{" "}

                        of{" "}

                        <strong className="text-stone-800">
                          {pagination.total}
                        </strong>{" "}

                        restaurants
                      </p>

                      <div className="flex items-center gap-1.5">

                        <button
                          type="button"
                          disabled={
                            pagination.current_page <= 1
                          }
                          onClick={() =>
                            changePage(
                              pagination.current_page - 1
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FiChevronLeft className="h-4 w-4" />
                        </button>

                        {paginationNumbers.map(
                          (item, index) => {
                            if (item === "...") {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="px-1 text-xs text-stone-400"
                                >
                                  ...
                                </span>
                              );
                            }

                            const active =
                              item ===
                              pagination.current_page;

                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() =>
                                  changePage(item)
                                }
                                className={[
                                  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition",
                                  active
                                    ? "bg-orange-600 text-white"
                                    : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
                                ].join(" ")}
                              >
                                {item}
                              </button>
                            );
                          }
                        )}

                        <button
                          type="button"
                          disabled={
                            pagination.current_page >=
                            pagination.last_page
                          }
                          onClick={() =>
                            changePage(
                              pagination.current_page + 1
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FiChevronRight className="h-4 w-4" />
                        </button>

                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Restaurant details panel                                         */}
            {/* ---------------------------------------------------------------- */}

            <div className="xl:col-span-4">

              <div className="sticky top-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">

                {selectedRestaurant ? (
                  <>

                    {/* Image */}

                    <div className="relative h-40 overflow-hidden bg-stone-100">

                      {normalizeImageUrl(
                        getRestaurantImage(
                          selectedRestaurant
                        )
                      ) ? (
                        <img
                          src={
                            normalizeImageUrl(
                              getRestaurantImage(
                                selectedRestaurant
                              )
                            ) as string
                          }
                          alt={
                            selectedRestaurant.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-stone-100">
                          <FiHome className="h-12 w-12 text-orange-500" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">

                        <div className="flex items-center justify-between gap-2">

                          <StatusBadge
                            active={
                              selectedRestaurant.is_active
                            }
                          />

                          <ApprovalBadge
                            approved={
                              selectedRestaurant.approved
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Details */}

                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <h2 className="truncate text-xl font-bold tracking-tight text-[#29231d]">
                            {selectedRestaurant.name}
                          </h2>

                          <p className="mt-1 text-sm text-stone-500">
                            {formatCuisine(
                              selectedRestaurant.cuisine_type
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                          <FiHome className="h-5 w-5" />
                        </div>
                      </div>

                      {selectedRestaurant.description && (
                        <p className="mt-4 text-sm leading-6 text-stone-600">
                          {
                            selectedRestaurant.description
                          }
                        </p>
                      )}

                      {/* Information */}

                      <div className="mt-5 space-y-2 rounded-2xl bg-[#faf7f2] p-4">

                        <div className="flex items-start justify-between gap-4">

                          <span className="text-xs font-semibold text-stone-500">
                            Price Range
                          </span>

                          <span className="text-right text-sm font-bold text-stone-800">
                            {formatPriceRange(
                              selectedRestaurant.price_range
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">

                          <span className="text-xs font-semibold text-stone-500">
                            Location
                          </span>

                          <span className="max-w-[220px] text-right text-sm font-semibold text-stone-800">
                            {getRestaurantLocation(
                              selectedRestaurant
                            )}
                          </span>
                        </div>

                        {selectedRestaurant.phone && (
                          <div className="flex items-center justify-between gap-4">

                            <span className="text-xs font-semibold text-stone-500">
                              Phone
                            </span>

                            <a
                              href={`tel:${selectedRestaurant.phone}`}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700"
                            >
                              <FiPhone className="h-3.5 w-3.5" />
                              {
                                selectedRestaurant.phone
                              }
                            </a>
                          </div>
                        )}

                        {selectedRestaurant.email && (
                          <div className="flex items-start justify-between gap-4">

                            <span className="text-xs font-semibold text-stone-500">
                              Email
                            </span>

                            <a
                              href={`mailto:${selectedRestaurant.email}`}
                              className="max-w-[220px] truncate text-right text-sm font-semibold text-orange-600 hover:text-orange-700"
                            >
                              {
                                selectedRestaurant.email
                              }
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}

                      <div className="mt-5 space-y-2">

                        <Link
                          href={`/admin/restaurants/${selectedRestaurant.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
                        >
                          <FiEye className="h-4 w-4" />
                          View Restaurant
                        </Link>

                        <Link
                          href={`/admin/restaurants/${selectedRestaurant.id}/edit`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
                        >
                          <FiEdit3 className="h-4 w-4" />
                          Edit Restaurant
                        </Link>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRestaurant(null)
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-stone-400 hover:text-stone-700"
                      >
                        <FiXCircle className="h-3.5 w-3.5" />
                        Close Details
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <FiHome className="h-7 w-7" />
                    </div>

                    <h2 className="mt-5 text-lg font-bold text-[#29231d]">
                      Restaurant Details
                    </h2>

                    <p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">
                      Select a restaurant from the
                      table to view its contact
                      information, location, status
                      and other backend data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* API note                                                          */}
          {/* ---------------------------------------------------------------- */}

          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">

            <div className="flex items-start gap-3">

              <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

              <div>

                <p className="text-sm font-bold text-orange-900">
                  Admin API note
                </p>

                <p className="mt-1 text-xs leading-5 text-orange-800">
                  This page currently uses the existing
                  Laravel{" "}
                  <code className="rounded bg-orange-100 px-1 py-0.5 font-mono">
                    /restaurants
                  </code>{" "}
                  endpoint. That endpoint currently
                  returns active and approved
                  restaurants. To make this admin
                  registry display inactive and pending
                  restaurants from the backend as well,
                  use a dedicated admin restaurant
                  endpoint.
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}