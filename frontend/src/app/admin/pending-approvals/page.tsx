"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiDatabase,
  FiDownload,
  FiEdit3,
  FiExternalLink,
  FiFileText,
  FiFilter,
  FiHome,
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
  FiXCircle,
  FiMapPin,
} from "react-icons/fi";

import { apiFetch } from "@/lib/api";
import AdminSidebar from "@/components/admin/AdminSidebar";

type Restaurant = {
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
  created_at?: string | null;
  updated_at?: string | null;

  // Optional fields supported if your admin API supplies them.
  owner_name?: string | null;
  applicant_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  tin?: string | null;
  status?: string | null;
  approval_status?: string | null;
  documents?: unknown;
  capacity?: number | null;
  table_count?: number | null;
};

type PaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

type LaravelPagination<T> = {
  current_page: number;
  data: T[];
  first_page_url?: string;
  from?: number | null;
  last_page: number;
  last_page_url?: string;
  links?: PaginationLink[];
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number | null;
  total: number;
};

type RestaurantApiResponse = {
  success?: boolean;
  message?: string;
  data: LaravelPagination<Restaurant> | Restaurant[];
};

type ActionResponse = {
  success?: boolean;
  message?: string;
};

type Filter = "all" | "ready" | "action_required";

const ITEMS_PER_PAGE = 10;

function getPaginatedData(
  response: RestaurantApiResponse
): LaravelPagination<Restaurant> {
  if (Array.isArray(response.data)) {
    return {
      current_page: 1,
      data: response.data,
      last_page: 1,
      per_page: response.data.length || ITEMS_PER_PAGE,
      total: response.data.length,
      from: response.data.length ? 1 : null,
      to: response.data.length || null,
    };
  }

  return response.data;
}

function formatCuisine(value?: string | null) {
  if (!value) {
    return "Cuisine not specified";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLocation(restaurant: Restaurant) {
  return [
    restaurant.address,
    restaurant.city,
    restaurant.state,
    restaurant.zip,
  ]
    .filter(Boolean)
    .join(", ");
}

function getApplicantName(restaurant: Restaurant) {
  return (
    restaurant.applicant_name ||
    restaurant.owner_name ||
    "Applicant information unavailable"
  );
}

function getApplicantInitials(restaurant: Restaurant) {
  const name = getApplicantName(restaurant);

  if (
    name === "Applicant information unavailable" ||
    !name.trim()
  ) {
    return "NA";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRestaurantImage(restaurant: Restaurant) {
  const photos = restaurant.photos;

  if (Array.isArray(photos) && photos.length > 0) {
    const firstPhoto = photos[0];

    if (typeof firstPhoto === "string") {
      return firstPhoto;
    }

    if (
      typeof firstPhoto === "object" &&
      firstPhoto !== null &&
      "url" in firstPhoto &&
      typeof firstPhoto.url === "string"
    ) {
      return firstPhoto.url;
    }
  }

  if (typeof photos === "string" && photos.trim()) {
    return photos;
  }

  return null;
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/${value}`;
}

function getAgeLabel(createdAt?: string | null) {
  if (!createdAt) {
    return "Date unavailable";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  return `${days}d ago`;
}

function isActionRequired(restaurant: Restaurant) {
  const approvalStatus = (
    restaurant.approval_status || ""
  ).toLowerCase();

  const status = (restaurant.status || "").toLowerCase();

  return (
    approvalStatus.includes("change") ||
    approvalStatus.includes("reject") ||
    approvalStatus.includes("incomplete") ||
    status.includes("change") ||
    status.includes("action") ||
    status.includes("incomplete")
  );
}

function isReadyForApproval(restaurant: Restaurant) {
  if (isActionRequired(restaurant)) {
    return false;
  }

  const approvalStatus = (
    restaurant.approval_status || ""
  ).toLowerCase();

  return (
    approvalStatus.includes("ready") ||
    approvalStatus.includes("pending") ||
    approvalStatus === ""
  );
}

function getApprovalLabel(restaurant: Restaurant) {
  if (isActionRequired(restaurant)) {
    return "Action Required";
  }

  if (isReadyForApproval(restaurant)) {
    return "Ready for Clearance";
  }

  return restaurant.approval_status || "Pending Review";
}

function getApprovalClasses(restaurant: Restaurant) {
  if (isActionRequired(restaurant)) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

function getDocumentCount(restaurant: Restaurant) {
  if (!restaurant.documents) {
    return null;
  }

  if (Array.isArray(restaurant.documents)) {
    return restaurant.documents.length;
  }

  if (typeof restaurant.documents === "object") {
    return Object.keys(restaurant.documents as object).length;
  }

  return null;
}

function getPriceRange(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value;
}

function getStatusLabel(restaurant: Restaurant) {
  if (restaurant.is_active) {
    return "Active";
  }

  return "Inactive";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load pending approvals.";
}

export default function PendingApprovalsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] =
    useState<LaravelPagination<Restaurant> | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | "changes" | null
  >(null);

  const [notificationCount] = useState(0);

  const loadPendingRestaurants = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("per_page", String(ITEMS_PER_PAGE));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await apiFetch<RestaurantApiResponse>(
          `/admin/restaurants/pending?${params.toString()}`
        );

        const result = getPaginatedData(response);

        setRestaurants(result.data);
        setPagination(result);

        setSelectedRestaurant((current) => {
          if (!result.data.length) {
            return null;
          }

          if (current) {
            const updated = result.data.find(
              (restaurant) => restaurant.id === current.id
            );

            return updated || result.data[0];
          }

          return result.data[0];
        });
      } catch (requestError) {
        console.error(requestError);
        setError(getErrorMessage(requestError));
        setRestaurants([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPendingRestaurants();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadPendingRestaurants]);

  const filteredRestaurants = useMemo(() => {
    switch (filter) {
      case "ready":
        return restaurants.filter(isReadyForApproval);

      case "action_required":
        return restaurants.filter(isActionRequired);

      default:
        return restaurants;
    }
  }, [restaurants, filter]);

  const readyCount = useMemo(
    () => restaurants.filter(isReadyForApproval).length,
    [restaurants]
  );

  const actionRequiredCount = useMemo(
    () => restaurants.filter(isActionRequired).length,
    [restaurants]
  );

  const documentReadyCount = useMemo(
    () =>
      restaurants.filter((restaurant) => {
        const count = getDocumentCount(restaurant);
        return count !== null && count > 0;
      }).length,
    [restaurants]
  );

  const approveRestaurant = async (restaurant: Restaurant) => {
    try {
      setActionLoading("approve");
      setError("");

      const response = await apiFetch<ActionResponse>(
        `/admin/restaurants/${restaurant.id}/approve`,
        {
          method: "PATCH",
        }
      );

      if (response.success === false) {
        throw new Error(
          response.message || "Restaurant could not be approved."
        );
      }

      setSelectedRestaurant(null);

      await loadPendingRestaurants(true);
    } catch (requestError) {
      console.error(requestError);
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRestaurant = async (restaurant: Restaurant) => {
    const reason = window.prompt(
      `Enter the rejection reason for ${restaurant.name}:`
    );

    if (!reason?.trim()) {
      return;
    }

    try {
      setActionLoading("reject");
      setError("");

      const response = await apiFetch<ActionResponse>(
        `/admin/restaurants/${restaurant.id}/reject`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      if (response.success === false) {
        throw new Error(
          response.message || "Restaurant could not be rejected."
        );
      }

      setSelectedRestaurant(null);

      await loadPendingRestaurants(true);
    } catch (requestError) {
      console.error(requestError);
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(null);
    }
  };

  const requestChanges = async (restaurant: Restaurant) => {
    const notes = window.prompt(
      `Enter the required changes for ${restaurant.name}:`
    );

    if (!notes?.trim()) {
      return;
    }

    try {
      setActionLoading("changes");
      setError("");

      const response = await apiFetch<ActionResponse>(
        `/admin/restaurants/${restaurant.id}/request-changes`,
        {
          method: "PATCH",
          body: JSON.stringify({
            notes: notes.trim(),
          }),
        }
      );

      if (response.success === false) {
        throw new Error(
          response.message || "Could not request changes."
        );
      }

      setSelectedRestaurant(null);

      await loadPendingRestaurants(true);
    } catch (requestError) {
      console.error(requestError);
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(null);
    }
  };

  const goToPage = (nextPage: number) => {
    if (
      nextPage < 1 ||
      (pagination && nextPage > pagination.last_page)
    ) {
      return;
    }

    setPage(nextPage);
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#29231d]">
      <AdminSidebar />

      <div className="lg:pl-30">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e3d9cc] bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex w-full max-w-md items-center gap-2 rounded-lg bg-[#f4eee7] px-3 py-2">
              <FiSearch className="h-4 w-4 shrink-0 text-stone-500" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search pending restaurants..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              API Online
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadPendingRestaurants(true)}
              disabled={refreshing}
              className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
              title="Refresh"
            >
              <FiRefreshCw
                className={[
                  "h-5 w-5",
                  refreshing ? "animate-spin" : "",
                ].join(" ")}
              />
            </button>

            <button
              type="button"
              className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100"
              title="Notifications"
            >
              <FiBell className="h-5 w-5" />

              {notificationCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#c65d32]">
              <FiUser className="h-4 w-4 text-white" />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#c65d32]">
                  <FiShield className="h-4 w-4" />
                  <span>
                    Restaurant Management • Compliance
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[#29231d] sm:text-4xl">
                  Pending Approvals
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                  Review restaurant onboarding submissions and approve,
                  reject, or request changes before restaurants become
                  available for reservations.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadPendingRestaurants(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e3d9cc] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Refresh Queue
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e3d9cc] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
                >
                  <FiDownload className="h-4 w-4" />
                  Export
                </button>
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    Unable to load approval queue
                  </div>

                  <div className="mt-1 wrap-break-word">
                    {error}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadPendingRestaurants(true)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Pending In Queue"
                value={pagination?.total ?? "—"}
                suffix="Venues"
                icon={FiClock}
                description="Restaurants awaiting admin review"
              />

              <MetricCard
                label="Ready For Review"
                value={loading ? "—" : readyCount}
                suffix="On this page"
                icon={FiCheckCircle}
                description="Records without detected action flags"
                positive
              />

              <MetricCard
                label="Action Required"
                value={loading ? "—" : actionRequiredCount}
                suffix="On this page"
                icon={FiAlertCircle}
                description="Restaurants requiring additional attention"
                danger={actionRequiredCount > 0}
              />

              <MetricCard
                label="With Documents"
                value={loading ? "—" : documentReadyCount}
                suffix="On this page"
                icon={FiFileText}
                description="Records containing document data"
              />
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-[#e3d9cc] bg-white p-2 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                <FilterButton
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  All Pending
                  <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">
                    {pagination?.total ?? 0}
                  </span>
                </FilterButton>

                <FilterButton
                  active={filter === "ready"}
                  onClick={() => setFilter("ready")}
                >
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  Ready
                </FilterButton>

                <FilterButton
                  active={filter === "action_required"}
                  onClick={() => setFilter("action_required")}
                >
                  <FiAlertCircle className="h-3.5 w-3.5" />
                  Action Required
                </FilterButton>
              </div>

              <div className="flex items-center gap-2 px-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#f4eee7] p-2.5 text-stone-600 transition hover:bg-stone-200"
                  title="Filter settings"
                >
                  <FiFilter className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              <div className="flex min-w-0 flex-col space-y-4 xl:col-span-5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#29231d]">
                      Queue Stream
                    </h2>

                    <span className="rounded-full bg-[#f4eee7] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Live Data
                    </span>
                  </div>

                  <span className="hidden text-xs text-stone-500 sm:block">
                    Newest submissions first
                  </span>
                </div>

                {loading ? (
                  <QueueSkeleton />
                ) : filteredRestaurants.length === 0 ? (
                  <EmptyQueue
                    search={search}
                    onClear={() => {
                      setSearch("");
                      setFilter("all");
                      setPage(1);
                    }}
                  />
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <RestaurantQueueCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      selected={
                        selectedRestaurant?.id === restaurant.id
                      }
                      onSelect={() =>
                        setSelectedRestaurant(restaurant)
                      }
                    />
                  ))
                )}

                {pagination && pagination.last_page > 1 && (
                  <Pagination
                    currentPage={pagination.current_page}
                    lastPage={pagination.last_page}
                    onPrevious={() =>
                      goToPage(pagination.current_page - 1)
                    }
                    onNext={() =>
                      goToPage(pagination.current_page + 1)
                    }
                  />
                )}
              </div>

              <div className="min-w-0 xl:col-span-7">
                {selectedRestaurant ? (
                  <ApprovalDossier
                    restaurant={selectedRestaurant}
                    actionLoading={actionLoading}
                    onApprove={approveRestaurant}
                    onReject={rejectRestaurant}
                    onRequestChanges={requestChanges}
                  />
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-[#d9cec0] bg-white p-8">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4eee7]">
                        <FiShield className="h-6 w-6 text-[#c65d32]" />
                      </div>

                      <h3 className="mt-4 text-lg font-bold">
                        No restaurant selected
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-stone-500">
                        Select a restaurant from the approval queue to
                        inspect its information.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  description,
  icon: Icon,
  positive,
  danger,
}: {
  label: string;
  value: number | string;
  suffix: string;
  description: string;
  icon: typeof FiClock;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#e3d9cc] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-600">
          {label}
        </span>

        <span
          className={[
            "rounded-lg p-2",
            danger
              ? "bg-red-50 text-red-600"
              : positive
                ? "bg-emerald-50 text-emerald-600"
                : "bg-[#f4eee7] text-[#c65d32]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">
          {value}
        </span>

        <span className="text-sm font-medium text-stone-500">
          {suffix}
        </span>
      </div>

      <p className="mt-1 text-xs text-stone-500">{description}</p>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
        active
          ? "bg-[#c65d32] text-white shadow-sm"
          : "text-stone-600 hover:bg-[#f4eee7] hover:text-stone-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RestaurantQueueCard({
  restaurant,
  selected,
  onSelect,
}: {
  restaurant: Restaurant;
  selected: boolean;
  onSelect: () => void;
}) {
  const image = normalizeImageUrl(getRestaurantImage(restaurant));
  const documentCount = getDocumentCount(restaurant);
  const actionRequired = isActionRequired(restaurant);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group w-full rounded-xl border bg-white p-5 text-left shadow-sm transition",
        selected
          ? "border-[#c65d32] ring-2 ring-[#c65d32]/20"
          : "border-[#e3d9cc] hover:border-[#d3c4b4] hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex gap-4">
        <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f4eee7] sm:block">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={restaurant.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FiHome className="h-7 w-7 text-stone-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-[10px] font-bold",
                    getApprovalClasses(restaurant),
                  ].join(" ")}
                >
                  {getApprovalLabel(restaurant)}
                </span>

                <span className="text-xs text-stone-400">
                  • {getAgeLabel(restaurant.created_at)}
                </span>
              </div>

              <h3 className="mt-2 truncate text-base font-bold text-[#29231d]">
                {restaurant.name}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <FiMapPin className="h-3.5 w-3.5" />
                  {getLocation(restaurant) ||
                    "Location unavailable"}
                </span>

                <span>•</span>

                <span>
                  {formatCuisine(restaurant.cuisine_type)}
                </span>
              </div>
            </div>

            <FiChevronRight className="mt-1 h-5 w-5 shrink-0 text-stone-400 transition group-hover:text-[#c65d32]" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#faf7f2] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#29231d] text-[10px] font-bold text-white">
                {getApplicantInitials(restaurant)}
              </span>

              <span className="truncate text-xs font-semibold text-stone-700">
                {getApplicantName(restaurant)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold">
              {documentCount !== null && (
                <span
                  className={
                    documentCount > 0
                      ? "flex items-center gap-1 text-emerald-600"
                      : "text-stone-500"
                  }
                >
                  <FiCheck className="h-3.5 w-3.5" />
                  {documentCount} docs
                </span>
              )}

              {actionRequired ? (
                <span className="flex items-center gap-1 text-red-600">
                  <FiAlertCircle className="h-3.5 w-3.5" />
                  Review
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600">
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function ApprovalDossier({
  restaurant,
  actionLoading,
  onApprove,
  onReject,
  onRequestChanges,
}: {
  restaurant: Restaurant;
  actionLoading: "approve" | "reject" | "changes" | null;
  onApprove: (restaurant: Restaurant) => void;
  onReject: (restaurant: Restaurant) => void;
  onRequestChanges: (restaurant: Restaurant) => void;
}) {
  const image = normalizeImageUrl(getRestaurantImage(restaurant));
  const documentCount = getDocumentCount(restaurant);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3d9cc] bg-white shadow-sm">
      <div className="border-b border-[#e3d9cc] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Restaurant #{restaurant.id}
              </span>

              <span
                className={[
                  "rounded-full px-2 py-1 text-[10px] font-semibold",
                  getApprovalClasses(restaurant),
                ].join(" ")}
              >
                {getApprovalLabel(restaurant)}
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#29231d]">
              {restaurant.name}
            </h2>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <FiMapPin className="h-3.5 w-3.5" />
                {getLocation(restaurant) ||
                  "Location unavailable"}
              </span>

              <span className="hidden sm:inline">•</span>

              <span>
                Submitted {getAgeLabel(restaurant.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href={`/admin/restaurants/${restaurant.id}`}
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              title="Open restaurant"
            >
              <FiExternalLink className="h-5 w-5" />
            </Link>

            <button
              type="button"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              title="More actions"
            >
              <FiMoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoBox
            label="Cuisine"
            value={formatCuisine(restaurant.cuisine_type)}
          />

          <InfoBox
            label="Price Range"
            value={getPriceRange(restaurant.price_range)}
          />

          <InfoBox
            label="Status"
            value={getStatusLabel(restaurant)}
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {image ? (
          <div className="mb-6 overflow-hidden rounded-xl border border-[#e3d9cc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={restaurant.name}
              className="h-56 w-full object-cover sm:h-64"
            />
          </div>
        ) : (
          <div className="mb-6 flex h-40 items-center justify-center rounded-xl bg-[#f4eee7]">
            <div className="text-center">
              <FiHome className="mx-auto h-8 w-8 text-stone-400" />
              <p className="mt-2 text-xs text-stone-500">
                No restaurant image provided
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <DossierSection
            icon={FiUser}
            title="Proprietor & Entity Information"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DossierField
                label="Applicant"
                value={getApplicantName(restaurant)}
              />

              <DossierField
                label="Email"
                value={
                  restaurant.owner_email ||
                  restaurant.email ||
                  "Not provided"
                }
              />

              <DossierField
                label="Phone"
                value={
                  restaurant.owner_phone ||
                  restaurant.phone ||
                  "Not provided"
                }
              />

              <DossierField
                label="TIN"
                value={restaurant.tin || "Not provided"}
                mono
              />
            </div>
          </DossierSection>

          <DossierSection
            icon={FiMapPin}
            title="Restaurant Information"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DossierField
                label="Restaurant Name"
                value={restaurant.name}
              />

              <DossierField
                label="Cuisine"
                value={formatCuisine(restaurant.cuisine_type)}
              />

              <DossierField
                label="Address"
                value={restaurant.address || "Not provided"}
              />

              <DossierField
                label="City"
                value={restaurant.city || "Not provided"}
              />

              <DossierField
                label="State / Region"
                value={restaurant.state || "Not provided"}
              />

              <DossierField
                label="Postal Code"
                value={restaurant.zip || "Not provided"}
              />
            </div>
          </DossierSection>

          <DossierSection
            icon={FiFileText}
            title="Submitted Documentation"
          >
            {documentCount !== null ? (
              <div className="rounded-xl bg-[#faf7f2] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      Documents submitted
                    </div>

                    <div className="mt-1 text-xs text-stone-500">
                      The backend reported {documentCount} document
                      {documentCount === 1 ? "" : "s"} for this
                      restaurant.
                    </div>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FiFileText className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9cec0] bg-[#faf7f2] p-5 text-sm text-stone-500">
                No document collection was returned by the current
                restaurant API response.
              </div>
            )}
          </DossierSection>

          <DossierSection
            icon={FiActivity}
            title="System Information"
          >
            <div className="rounded-xl bg-[#faf7f2] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SystemRow
                  label="Restaurant ID"
                  value={String(restaurant.id)}
                />

                <SystemRow
                  label="Current Approval"
                  value={
                    restaurant.approved ? "Approved" : "Pending"
                  }
                />

                <SystemRow
                  label="Active Status"
                  value={
                    restaurant.is_active ? "Active" : "Inactive"
                  }
                />

                <SystemRow
                  label="Created"
                  value={
                    restaurant.created_at
                      ? new Date(
                          restaurant.created_at
                        ).toLocaleString()
                      : "Not available"
                  }
                />

                <SystemRow
                  label="Last Updated"
                  value={
                    restaurant.updated_at
                      ? new Date(
                          restaurant.updated_at
                        ).toLocaleString()
                      : "Not available"
                  }
                />
              </div>
            </div>
          </DossierSection>
        </div>
      </div>

      <div className="sticky bottom-4 mx-4 mb-4 flex flex-col gap-3 rounded-xl bg-[#29231d]/95 p-4 text-white shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <FiShield className="h-5 w-5 text-orange-300" />
          </div>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold">
              Approval Decision
            </div>

            <div className="text-xs text-stone-400">
              This action will update the restaurant approval state.
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={() => onReject(restaurant)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiXCircle className="h-4 w-4" />

            {actionLoading === "reject"
              ? "Rejecting..."
              : "Reject"}
          </button>

          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={() => onRequestChanges(restaurant)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiEdit3 className="h-4 w-4" />

            {actionLoading === "changes"
              ? "Sending..."
              : "Request Changes"}
          </button>

          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={() => onApprove(restaurant)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c65d32] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#a94b27] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "approve" ? (
              <FiRefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FiCheck className="h-4 w-4" />
            )}

            {actionLoading === "approve"
              ? "Approving..."
              : "Approve & Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DossierSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FiUser;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#c65d32]" />

        <h3 className="text-base font-bold text-[#29231d]">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function DossierField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#faf7f2] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        {label}
      </div>

      <div
        className={[
          "mt-1 text-sm font-semibold text-[#29231d]",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[#faf7f2] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}

function SystemRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e3d9cc] pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-stone-500">{label}</span>

      <span className="text-right text-xs font-semibold text-stone-800">
        {value}
      </span>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-[#e3d9cc] bg-white p-5"
        >
          <div className="flex gap-4">
            <div className="hidden h-20 w-20 rounded-lg bg-stone-200 sm:block" />

            <div className="flex-1">
              <div className="h-5 w-32 rounded bg-stone-200" />
              <div className="mt-3 h-5 w-2/3 rounded bg-stone-200" />
              <div className="mt-2 h-4 w-1/2 rounded bg-stone-200" />
              <div className="mt-5 h-10 rounded-lg bg-stone-100" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyQueue({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#d9cec0] bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4eee7]">
        <FiCheckCircle className="h-7 w-7 text-[#c65d32]" />
      </div>

      <h3 className="mt-4 text-lg font-bold">
        {search
          ? "No matching pending restaurants"
          : "Approval queue is empty"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">
        {search
          ? "Try a different search term or clear the current filters."
          : "There are currently no restaurants waiting for approval."}
      </p>

      {search && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-lg bg-[#c65d32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a94b27]"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  lastPage,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  lastPage: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e3d9cc] bg-white px-4 py-3 shadow-sm">
      <span className="text-xs text-stone-500">
        Page {currentPage} of {lastPage}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-[#e3d9cc] px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= lastPage}
          className="inline-flex items-center gap-1 rounded-lg bg-[#c65d32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#a94b27] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <FiChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}