"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";

type TableStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "seated"
  | "maintenance"
  | "cleaning"
  | "turnover"
  | "inactive"
  | string;

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "declined"
  | "cancelled"
  | "no_show"
  | string;

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
  photos?: string[] | null;
  is_active?: boolean;
  approved?: boolean;
}

interface RestaurantTable {
  id: number;
  restaurant_id: number;
  table_number: string | number;
  name?: string | null;
  capacity: number;
  status: TableStatus;
  location?: string | null;
  section?: string | null;
  zone?: string | null;
  shape?: string | null;
  type?: string | null;
  description?: string | null;
  cuisine?: string | null;
  approval_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Reservation {
  id: number;
  restaurant_id: number;
  user_id?: number;
  table_id?: number | null;

  party_size: number;

  reservation_date: string;
  reservation_time: string;

  status: ReservationStatus;

  notes?: string | null;
  special_requests?: string | null;

  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  restaurant?: {
    id?: number;
    name?: string | null;
  } | null;

  table?: {
    id?: number;
    table_number?: string | number;
    capacity?: number;
  } | null;

  created_at?: string;
  updated_at?: string;
}

interface ApiListResponse<T> {
  success?: boolean;
  message?: string;
  data:
    | T[]
    | {
        data?: T[];
        current_page?: number;
        last_page?: number;
        total?: number;
      };
}

interface ApiSingleResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

type ZoneFilter = "all" | string;

interface FloorTablesProps {
  restaurantId?: number | null;
}

function unwrapList<T>(
  response: ApiListResponse<T> | T[]
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function unwrapSingle<T>(
  response: ApiSingleResponse<T> | T
): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as ApiSingleResponse<T>).data;
  }

  return response as T;
}

function normalizeStatus(status?: string | null): string {
  return String(status || "available")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatus(status?: string | null): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "occupied":
      return "Occupied";

    case "seated":
      return "Seated";

    case "reserved":
      return "Reserved";

    case "cleaning":
      return "Cleaning";

    case "turnover":
      return "Turnover";

    case "maintenance":
      return "Maintenance";

    case "inactive":
      return "Inactive";

    case "available":
    default:
      return "Available";
  }
}

function getInitials(name?: string | null): string {
  if (!name) {
    return "D";
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getTableLabel(table: RestaurantTable): string {
  if (table.name) {
    return table.name;
  }

  return `Table ${table.table_number}`;
}

function getTableZone(table: RestaurantTable): string {
  return (
    table.zone ||
    table.section ||
    table.location ||
    "Main Dining"
  );
}

function getTableShape(table: RestaurantTable): string {
  return (
    table.shape ||
    table.type ||
    "Standard"
  );
}

function reservationDateTime(
  reservation: Reservation
): number {
  const value = `${reservation.reservation_date} ${reservation.reservation_time}`;

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return timestamp;
}

function isActiveReservation(
  reservation: Reservation
): boolean {
  const status = normalizeStatus(reservation.status);

  return [
    "pending",
    "confirmed",
    "seated",
  ].includes(status);
}

function isCurrentOrUpcomingReservation(
  reservation: Reservation
): boolean {
  if (!isActiveReservation(reservation)) {
    return false;
  }

  const reservationTime = reservationDateTime(reservation);

  if (!reservationTime) {
    return true;
  }

  const now = Date.now();

  // Keep reservations from the current day and upcoming
  // reservations visible. A reservation may remain useful
  // to staff for a short period after its start time.
  return reservationTime >= now - 3 * 60 * 60 * 1000;
}

function findReservationForTable(
  table: RestaurantTable,
  reservations: Reservation[]
): Reservation | undefined {
  const matching = reservations
    .filter((reservation) => {
      if (!isCurrentOrUpcomingReservation(reservation)) {
        return false;
      }

      if (
        reservation.table_id &&
        Number(reservation.table_id) === Number(table.id)
      ) {
        return true;
      }

      if (
        reservation.table?.id &&
        Number(reservation.table.id) === Number(table.id)
      ) {
        return true;
      }

      return false;
    })
    .sort(
      (a, b) =>
        reservationDateTime(a) -
        reservationDateTime(b)
    );

  return matching[0];
}

function getEffectiveTableStatus(
  table: RestaurantTable,
  reservation?: Reservation
): string {
  const status = normalizeStatus(table.status);

  if (
    status === "occupied" ||
    status === "seated"
  ) {
    return "seated";
  }

  if (
    status === "cleaning" ||
    status === "turnover"
  ) {
    return status;
  }

  if (
    reservation &&
    ["pending", "confirmed"].includes(
      normalizeStatus(reservation.status)
    )
  ) {
    return "reserved";
  }

  return status || "available";
}

function statusClasses(status: string) {
  switch (normalizeStatus(status)) {
    case "seated":
    case "occupied":
      return {
        card:
          "bg-surface-container-low hover:bg-surface-container hover:shadow-md",
        icon:
          "bg-primary text-on-primary",
        badge:
          "bg-primary-container text-on-primary-container",
        badgeText: "Seated",
        accent: "text-primary",
      };

    case "reserved":
      return {
        card:
          "bg-tertiary-fixed/20 hover:bg-tertiary-fixed/35",
        icon:
          "bg-surface-container-highest",
        badge:
          "bg-tertiary-fixed text-on-tertiary-fixed",
        badgeText: "Reserved",
        accent: "text-tertiary",
      };

    case "cleaning":
    case "turnover":
      return {
        card:
          "bg-secondary-fixed/30 hover:bg-secondary-fixed/50",
        icon:
          "bg-secondary text-on-secondary",
        badge:
          "bg-secondary text-on-secondary",
        badgeText: "Turnover",
        accent: "text-secondary",
      };

    case "maintenance":
      return {
        card:
          "bg-error-container/30 hover:bg-error-container/50",
        icon:
          "bg-error text-on-error",
        badge:
          "bg-error text-on-error",
        badgeText: "Maintenance",
        accent: "text-error",
      };

    default:
      return {
        card:
          "bg-surface-container-lowest hover:bg-surface-container-low",
        icon:
          "bg-surface-container-high",
        badge:
          "bg-surface-container-high text-on-surface-variant",
        badgeText: "Available",
        accent: "text-primary",
      };
  }
}

function getStatusIcon(status: string) {
  switch (normalizeStatus(status)) {
    case "seated":
    case "occupied":
      return "restaurant";

    case "reserved":
      return "event_available";

    case "cleaning":
    case "turnover":
      return "cleaning_services";

    case "maintenance":
      return "build";

    default:
      return "table_restaurant";
  }
}

export default function FloorTables({
  restaurantId,
}: FloorTablesProps) {
  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [tables, setTables] = useState<
    RestaurantTable[]
  >([]);

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [selectedTableId, setSelectedTableId] =
    useState<number | null>(null);

  const [zoneFilter, setZoneFilter] =
    useState<ZoneFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [showWalkInModal, setShowWalkInModal] =
    useState(false);

  const [walkInGuests, setWalkInGuests] =
    useState("");

  const user = useMemo(() => {
    return getUser();
  }, []);

  const resolvedRestaurantId = useMemo(() => {
    if (restaurantId) {
      return Number(restaurantId);
    }

    if (user?.role === "staff") {
      const rawUser = user as typeof user & {
        restaurant_id?: number | null;
      };

      if (rawUser.restaurant_id) {
        return Number(rawUser.restaurant_id);
      }
    }

    return null;
  }, [restaurantId, user]);

  const loadData = useCallback(
    async (silent = false) => {
      if (!resolvedRestaurantId) {
        setLoading(false);
        setError(
          "Your staff account is not assigned to a restaurant."
        );
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const [
          restaurantResponse,
          tablesResponse,
          reservationsResponse,
        ] = await Promise.all([
          apiFetch<
            ApiSingleResponse<Restaurant> | Restaurant
          >(
            `/restaurants/${resolvedRestaurantId}`
          ),

          apiFetch<
            ApiListResponse<RestaurantTable> |
              RestaurantTable[]
          >(
            `/restaurants/${resolvedRestaurantId}/tables`
          ),

          apiFetch<
            ApiListResponse<Reservation> |
              Reservation[]
          >(
            `/restaurants/${resolvedRestaurantId}/reservations`
          ),
        ]);

        const restaurantData =
          unwrapSingle<Restaurant>(
            restaurantResponse
          );

        const tableData =
          unwrapList<RestaurantTable>(
            tablesResponse
          );

        const reservationData =
          unwrapList<Reservation>(
            reservationsResponse
          );

        setRestaurant(restaurantData);
        setTables(tableData);
        setReservations(reservationData);

        setLastUpdated(new Date());

        if (
          selectedTableId &&
          !tableData.some(
            (table) =>
              Number(table.id) ===
              Number(selectedTableId)
          )
        ) {
          setSelectedTableId(
            tableData[0]?.id ?? null
          );
        }

        if (!selectedTableId && tableData.length) {
          setSelectedTableId(tableData[0].id);
        }
      } catch (err) {
        console.error(
          "Unable to load floor data:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load floor and table data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      resolvedRestaurantId,
      selectedTableId,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData(true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadData]);

  const tableView = useMemo(() => {
    return tables.map((table) => {
      const reservation =
        findReservationForTable(
          table,
          reservations
        );

      const status =
        getEffectiveTableStatus(
          table,
          reservation
        );

      return {
        table,
        reservation,
        status,
      };
    });
  }, [tables, reservations]);

  const zones = useMemo(() => {
    const unique = Array.from(
      new Set(
        tables.map((table) =>
          getTableZone(table)
        )
      )
    );

    return unique.filter(Boolean);
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (zoneFilter === "all") {
      return tableView;
    }

    return tableView.filter(
      ({ table }) =>
        getTableZone(table) === zoneFilter
    );
  }, [tableView, zoneFilter]);

  const selectedTable = useMemo(() => {
    if (!selectedTableId) {
      return null;
    }

    return (
      tableView.find(
        ({ table }) =>
          Number(table.id) ===
          Number(selectedTableId)
      ) ?? null
    );
  }, [selectedTableId, tableView]);

  const statistics = useMemo(() => {
    const total = tables.length;

    const seated = tableView.filter(
      ({ status }) =>
        ["seated", "occupied"].includes(
          normalizeStatus(status)
        )
    ).length;

    const reserved = tableView.filter(
      ({ status }) =>
        normalizeStatus(status) === "reserved"
    ).length;

    const turnover = tableView.filter(
      ({ status }) =>
        ["turnover", "cleaning"].includes(
          normalizeStatus(status)
        )
    ).length;

    const available = tableView.filter(
      ({ status }) =>
        normalizeStatus(status) ===
        "available"
    ).length;

    const totalSeats = tables.reduce(
      (sum, table) =>
        sum + Number(table.capacity || 0),
      0
    );

    const occupiedSeats =
      tableView.reduce(
        (sum, item) => {
          const status =
            normalizeStatus(item.status);

          if (
            status === "seated" ||
            status === "occupied"
          ) {
            return (
              sum +
              Number(
                item.reservation?.party_size ||
                  item.table.capacity ||
                  0
              )
            );
          }

          return sum;
        },
        0
      );

    const occupancy =
      totalSeats > 0
        ? Math.round(
            (occupiedSeats / totalSeats) *
              100
          )
        : 0;

    const pendingReservations =
      reservations.filter(
        (reservation) =>
          normalizeStatus(
            reservation.status
          ) === "pending"
      ).length;

    const activeReservations =
      reservations.filter(
        isActiveReservation
      ).length;

    return {
      total,
      seated,
      reserved,
      turnover,
      available,
      totalSeats,
      occupiedSeats,
      occupancy,
      pendingReservations,
      activeReservations,
    };
  }, [tables, tableView, reservations]);

  const upcomingArrivals = useMemo(() => {
    return reservations
      .filter((reservation) => {
        const status =
          normalizeStatus(
            reservation.status
          );

        return [
          "pending",
          "confirmed",
        ].includes(status);
      })
      .filter(
        isCurrentOrUpcomingReservation
      )
      .sort(
        (a, b) =>
          reservationDateTime(a) -
          reservationDateTime(b)
      )
      .slice(0, 5);
  }, [reservations]);

  const handleTableStatus = async (
    table: RestaurantTable,
    status: string
  ) => {
    if (!resolvedRestaurantId) {
      return;
    }

    try {
      setActionLoading(true);

      await apiFetch(
        `/restaurants/${resolvedRestaurantId}/tables/${table.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
          }),
        }
      );

      await loadData(true);
    } catch (err) {
      console.error(
        "Unable to update table status:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update table status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReservationStatus = async (
    reservation: Reservation,
    status: ReservationStatus
  ) => {
    try {
      setActionLoading(true);

      await apiFetch(
        `/reservations/${reservation.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
          }),
        }
      );

      await loadData(true);
    } catch (err) {
      console.error(
        "Unable to update reservation status:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update reservation."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!selectedTable) {
      return;
    }

    const {
      table,
      reservation,
      status,
    } = selectedTable;

    const normalized =
      normalizeStatus(status);

    if (
      reservation &&
      ["pending", "confirmed"].includes(
        normalizeStatus(
          reservation.status
        )
      )
    ) {
      await handleReservationStatus(
        reservation,
        "seated"
      );

      return;
    }

    if (
      normalized === "seated" ||
      normalized === "occupied"
    ) {
      // The backend currently exposes reservation
      // status changes rather than a dedicated
      // "request bill" endpoint.
      if (reservation) {
        await handleReservationStatus(
          reservation,
          "completed"
        );
      }

      return;
    }

    if (
      normalized === "turnover" ||
      normalized === "cleaning"
    ) {
      await handleTableStatus(
        table,
        "available"
      );

      return;
    }

    if (normalized === "available") {
      setShowWalkInModal(true);
    }
  };

  const handleWalkIn = async () => {
    /*
     * The current Laravel backend does not expose
     * a dedicated staff walk-in reservation endpoint.
     *
     * Therefore this UI intentionally does not create
     * fake reservations or fake guests.
     *
     * Staff can use the normal reservation creation
     * flow once a reservation endpoint specifically
     * supports walk-ins.
     */

    setShowWalkInModal(false);
    setWalkInGuests("");
  };

  const primaryActionText = useMemo(() => {
    if (!selectedTable) {
      return "Select a Table";
    }

    const status =
      normalizeStatus(
        selectedTable.status
      );

    if (
      selectedTable.reservation &&
      ["pending", "confirmed"].includes(
        normalizeStatus(
          selectedTable.reservation.status
        )
      )
    ) {
      return "Seat Party Now";
    }

    if (
      status === "seated" ||
      status === "occupied"
    ) {
      return "Complete Service";
    }

    if (
      status === "turnover" ||
      status === "cleaning"
    ) {
      return "Mark Reset Complete";
    }

    return "Seat New Walk-In";
  }, [selectedTable]);

  const selectedStatusStyle =
    selectedTable
      ? statusClasses(
          selectedTable.status
        )
      : statusClasses("available");

  const restaurantName =
    restaurant?.name ||
    "Restaurant";

  const restaurantLocation = [
    restaurant?.address,
    restaurant?.city,
    restaurant?.state,
  ]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-8 py-8">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-container border-t-primary" />

            <p className="font-label-md text-label-md text-on-surface-variant">
              Loading floor and table data...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-background px-8 py-6">
      <div className="flex w-full flex-col gap-6 pb-12">
        {/* ERROR */}
        {error && (
          <section className="flex items-start justify-between gap-4 rounded-xl border border-error/20 bg-error-container/30 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-error">
                error
              </span>

              <div>
                <p className="font-label-md text-label-md font-semibold text-error">
                  Floor data unavailable
                </p>

                <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              className="rounded-lg bg-error px-4 py-2 font-label-md text-label-md font-semibold text-on-error transition hover:opacity-90"
            >
              Retry
            </button>
          </section>
        )}

        {/* TOP STATUS / HEADER */}
        <section className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(1,38,31,0.03)] lg:flex-row lg:items-center lg:p-8">
          <div className="flex max-w-2xl flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary-fixed px-2.5 py-1 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-primary-fixed">
                Service Live
              </span>

              <span className="text-outline-variant">
                •
              </span>

              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-tertiary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary-container" />

                {restaurantLocation ||
                  restaurantName}
              </span>
            </div>

            <h1 className="font-headline-md text-headline-md tracking-tight text-primary">
              Floor &amp; Table Management
            </h1>

            <p className="font-body-md text-body-md text-on-surface-variant">
              Real-time table availability, occupancy,
              reservations, and seating assignments for{" "}
              <span className="font-semibold text-primary">
                {restaurantName}
              </span>
              .
            </p>

            {lastUpdated && (
              <span className="font-label-sm text-label-sm text-outline">
                Last updated{" "}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* QUICK OPERATIONS */}
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <button
              type="button"
              onClick={() =>
                setShowWalkInModal(true)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-on-primary shadow-sm transition-all hover:bg-primary-container hover:text-on-primary-container lg:flex-initial"
            >
              <span className="material-symbols-outlined text-[20px]">
                person_add
              </span>

              <span className="font-label-md text-label-md font-semibold">
                + Walk-in Seating
              </span>
            </button>

            <button
              type="button"
              disabled
              title="Table merge is not currently exposed by the backend"
              className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-on-surface opacity-60"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">
                call_merge
              </span>

              <span className="font-label-md text-label-md font-semibold">
                Merge Tables
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-on-surface transition-all hover:bg-surface-container"
              title="Print Floor Sheet"
            >
              <span className="material-symbols-outlined text-[20px]">
                print
              </span>

              <span className="font-label-md text-label-md font-semibold">
                Floor Sheet
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-on-surface transition-all hover:bg-surface-container disabled:opacity-60"
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              >
                refresh
              </span>

              <span className="font-label-md text-label-md font-semibold">
                Refresh
              </span>
            </button>
          </div>
        </section>

        {/* METRICS */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* CAPACITY */}
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                Capacity &amp; Scale
              </span>

              <span className="material-symbols-outlined text-primary-fixed-variant">
                chair_alt
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md font-bold text-primary">
                {statistics.totalSeats}
              </span>

              <span className="font-label-md text-label-md text-outline">
                Seats
              </span>
            </div>

            <div className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
              <span className="font-semibold text-primary">
                {statistics.total}
              </span>{" "}
              Tables across{" "}
              <span className="font-semibold">
                {zones.length}
              </span>{" "}
              active zones
            </div>
          </div>

          {/* OCCUPANCY */}
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                Active Occupancy
              </span>

              <span className="material-symbols-outlined text-secondary">
                donut_large
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md font-bold text-secondary">
                {statistics.occupancy}%
              </span>

              <span className="font-label-md text-label-md text-outline">
                ({statistics.seated} seated)
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    statistics.occupancy,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* RESERVATIONS */}
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                Reservations
              </span>

              <span className="material-symbols-outlined text-tertiary">
                event
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                {statistics.activeReservations}
              </span>

              <span className="font-label-md text-label-md text-outline">
                active
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
              <span className="font-semibold text-secondary">
                {statistics.pendingReservations}
              </span>

              pending confirmation
            </div>
          </div>

          {/* LIVE STATUS */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-primary p-5 text-on-primary shadow-[0_4px_16px_rgba(1,38,31,0.1)]">
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary-container opacity-40 blur-xl" />

            <div className="relative flex items-center justify-between text-primary-fixed">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                Live Floor
              </span>

              <span className="material-symbols-outlined text-[18px]">
                table_restaurant
              </span>
            </div>

            <div className="relative mt-4 flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md font-bold text-on-primary">
                {statistics.available}
              </span>

              <span className="font-label-sm text-label-sm text-primary-fixed">
                tables available
              </span>
            </div>

            <div className="relative mt-2 font-label-sm text-label-sm text-on-primary-container">
              {statistics.reserved} reserved •{" "}
              {statistics.turnover} turnover
            </div>
          </div>
        </section>

        {/* ZONE FILTERS */}
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest px-6 py-4 shadow-[0_2px_8px_rgba(1,38,31,0.02)] lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              type="button"
              onClick={() =>
                setZoneFilter("all")
              }
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-label-md text-label-md font-semibold transition-all ${
                zoneFilter === "all"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              All Zones ({tables.length})
            </button>

            {zones.map((zone) => {
              const count = tables.filter(
                (table) =>
                  getTableZone(table) ===
                  zone
              ).length;

              return (
                <button
                  type="button"
                  key={zone}
                  onClick={() =>
                    setZoneFilter(zone)
                  }
                  className={`whitespace-nowrap rounded-lg px-4 py-2 font-label-md text-label-md font-medium transition-all ${
                    zoneFilter === zone
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {zone} ({count})
                </button>
              );
            })}
          </div>

          {/* STATUS LEGEND */}
          <div className="flex flex-wrap items-center gap-4 pt-2 font-label-sm text-label-sm text-on-surface lg:pt-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary-fixed" />

              <span className="font-medium">
                Seated
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-tertiary-container ring-4 ring-tertiary-fixed" />

              <span className="font-medium">
                Reserved
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-tint" />

              <span className="font-medium">
                Available
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-secondary-fixed" />

              <span className="font-medium">
                Turnover
              </span>
            </div>
          </div>
        </section>

        {/* MAIN WORKSPACE */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* FLOOR */}
          <div className="flex flex-col gap-6 xl:col-span-8">
            <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
              <div className="mb-5 flex items-center justify-between border-b border-outline-variant/40 pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-primary">
                    restaurant
                  </span>

                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-primary">
                      Dining Floor
                    </h2>

                    <span className="font-label-sm text-label-sm text-outline">
                      Live tables and seating assignments
                    </span>
                  </div>
                </div>

                <span className="rounded-lg bg-surface-container-low px-3 py-1 font-label-sm text-label-sm font-semibold text-on-surface-variant">
                  {filteredTables.length} Tables
                </span>
              </div>

              {filteredTables.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline">
                    table_restaurant
                  </span>

                  <p className="mt-3 font-headline-sm text-headline-sm text-primary">
                    No tables found
                  </p>

                  <p className="mt-1 max-w-md font-label-sm text-label-sm text-on-surface-variant">
                    No tables are available for the
                    selected zone.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTables.map(
                    ({
                      table,
                      reservation,
                      status,
                    }) => {
                      const style =
                        statusClasses(
                          status
                        );

                      const isSelected =
                        Number(
                          selectedTableId
                        ) ===
                        Number(table.id);

                      const guestName =
                        reservation?.user
                          ?.name ||
                        "Available for Seating";

                      const partySize =
                        reservation?.party_size ||
                        table.capacity;

                      const reservationStatus =
                        normalizeStatus(
                          reservation?.status
                        );

                      return (
                        <button
                          type="button"
                          key={table.id}
                          onClick={() =>
                            setSelectedTableId(
                              table.id
                            )
                          }
                          className={`group flex cursor-pointer flex-col justify-between gap-4 rounded-xl p-4 text-left transition-all ${style.card} ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-inner ${style.icon}`}
                              >
                                <span className="material-symbols-outlined text-[23px]">
                                  {getStatusIcon(
                                    status
                                  )}
                                </span>

                                {normalizeStatus(
                                  status
                                ) ===
                                  "reserved" && (
                                  <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-surface-container-lowest bg-tertiary-container" />
                                )}
                              </div>

                              <div>
                                <div
                                  className={`font-headline-sm text-[18px] font-bold ${
                                    isSelected
                                      ? "text-primary"
                                      : "text-on-surface"
                                  }`}
                                >
                                  {getTableLabel(
                                    table
                                  )}
                                </div>

                                <span className="font-label-sm text-label-sm text-outline">
                                  {table.capacity}{" "}
                                  Guests •{" "}
                                  {getTableShape(
                                    table
                                  )}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${style.badge}`}
                            >
                              {style.badgeText}
                            </span>
                          </div>

                          <div className="rounded-lg bg-surface-container-lowest p-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-label-md text-label-md font-semibold text-on-surface">
                                {guestName}
                              </span>

                              {reservation && (
                                <span
                                  className={`font-label-sm text-label-sm font-bold ${style.accent}`}
                                >
                                  {
                                    reservation.reservation_time
                                  }
                                </span>
                              )}
                            </div>

                            <span className="mt-1 block truncate font-label-sm text-[11px] text-on-surface-variant">
                              {reservation
                                ? `${partySize} Guests • ${formatStatus(
                                    reservationStatus
                                  )}`
                                : `${table.capacity} Seat Capacity • ${getTableZone(
                                    table
                                  )}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between font-label-sm text-[11px] text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-primary">
                                location_on
                              </span>

                              {getTableZone(
                                table
                              )}
                            </span>

                            <span
                              className={`font-semibold ${style.accent}`}
                            >
                              {normalizeStatus(
                                status
                              ) ===
                              "available"
                                ? "Assign"
                                : "Inspect"}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* UPCOMING ARRIVALS */}
            <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-secondary">
                    event_upcoming
                  </span>

                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-primary">
                      Arrival Wave
                    </h2>

                    <span className="font-label-sm text-label-sm text-outline">
                      Upcoming confirmed and pending parties
                    </span>
                  </div>
                </div>

                <span className="rounded-lg bg-secondary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-fixed">
                  {upcomingArrivals.length}
                </span>
              </div>

              {upcomingArrivals.length === 0 ? (
                <div className="rounded-xl bg-surface-container-low p-5">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    No upcoming arrivals found.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-outline-variant/30">
                  {upcomingArrivals.map(
                    (reservation) => {
                      const guest =
                        reservation.user
                          ?.name ||
                        "Guest";

                      const table =
                        tables.find(
                          (item) =>
                            Number(
                              item.id
                            ) ===
                            Number(
                              reservation.table_id
                            )
                        );

                      return (
                        <div
                          key={
                            reservation.id
                          }
                          className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
                              <span className="font-label-md text-label-md font-bold">
                                {getInitials(
                                  guest
                                )}
                              </span>
                            </div>

                            <div>
                              <p className="font-label-md text-label-md font-semibold text-primary">
                                {guest}
                              </p>

                              <p className="font-label-sm text-label-sm text-on-surface-variant">
                                {reservation.party_size}{" "}
                                Guests •{" "}
                                {table
                                  ? getTableLabel(
                                      table
                                    )
                                  : "Table unassigned"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-label-md text-label-md font-bold text-secondary">
                                {
                                  reservation.reservation_time
                                }
                              </p>

                              <p className="font-label-sm text-label-sm text-outline">
                                {
                                  reservation.reservation_date
                                }
                              </p>
                            </div>

                            <span className="rounded-full bg-tertiary-fixed px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-tertiary-fixed">
                              {formatStatus(
                                reservation.status
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTableId(
                                  table?.id ??
                                    null
                                )
                              }
                              className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
                            >
                              <span className="material-symbols-outlined text-[19px]">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>

          {/* INSPECTOR */}
          <aside className="flex flex-col gap-6 xl:sticky xl:top-24 xl:col-span-4">
            <section className="flex flex-col gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(1,38,31,0.04)]">
              {selectedTable ? (
                <>
                  {/* INSPECTOR HEADER */}
                  <div className="flex items-start justify-between border-b border-outline-variant/40 pb-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm font-semibold uppercase tracking-widest text-tertiary">
                        Active Inspector
                      </span>

                      <h3 className="font-headline-md text-headline-md leading-none text-primary">
                        {getTableLabel(
                          selectedTable.table
                        )}
                      </h3>

                      <span className="font-label-sm text-label-sm text-outline">
                        {getTableShape(
                          selectedTable.table
                        )}{" "}
                        • Capacity:{" "}
                        {
                          selectedTable.table
                            .capacity
                        }{" "}
                        Pax
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 font-label-sm text-label-sm font-bold uppercase tracking-wider ${selectedStatusStyle.badge}`}
                    >
                      {formatStatus(
                        selectedTable.status
                      )}
                    </span>
                  </div>

                  {/* GUEST / RESERVATION */}
                  <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary">
                        <span className="font-headline-sm text-[20px] font-bold">
                          {getInitials(
                            selectedTable
                              .reservation
                              ?.user?.name
                          )}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-headline-sm text-[18px] font-bold text-primary">
                            {selectedTable
                              .reservation
                              ?.user?.name ||
                              "No Guest Assigned"}
                          </span>

                          {selectedTable
                            .reservation && (
                            <span className="rounded-full bg-tertiary px-2 py-0.5 text-[10px] font-semibold text-on-tertiary">
                              Reservation
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px] text-secondary">
                            event
                          </span>

                          {selectedTable
                            .reservation
                            ? `${selectedTable.reservation.party_size} Guests • ${formatStatus(
                                selectedTable
                                  .reservation
                                  .status
                              )}`
                            : "Available for seating"}
                        </span>
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="flex flex-col rounded-lg bg-surface-container-lowest p-3">
                        <span className="font-label-sm text-[11px] font-semibold uppercase text-outline">
                          Seating Time
                        </span>

                        <span className="font-label-md text-label-md font-bold text-primary">
                          {selectedTable
                            .reservation
                            ?.reservation_time ||
                            "Immediate"}
                        </span>
                      </div>

                      <div className="flex flex-col rounded-lg bg-surface-container-lowest p-3">
                        <span className="font-label-sm text-[11px] font-semibold uppercase text-outline">
                          Table Zone
                        </span>

                        <span className="truncate font-label-md text-label-md font-bold text-primary">
                          {getTableZone(
                            selectedTable.table
                          )}
                        </span>
                      </div>
                    </div>

                    {/* CONTACT */}
                    {selectedTable
                      .reservation
                      ?.user && (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="font-label-sm text-[11px] font-semibold uppercase text-outline">
                          Guest Contact
                        </span>

                        <div className="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-3">
                          {selectedTable
                            .reservation
                            .user
                            .phone && (
                            <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-[15px] text-secondary">
                                call
                              </span>

                              {
                                selectedTable
                                  .reservation
                                  .user
                                  .phone
                              }
                            </span>
                          )}

                          {selectedTable
                            .reservation
                            .user
                            .email && (
                            <span className="flex items-center gap-2 truncate font-label-sm text-label-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-[15px] text-secondary">
                                mail
                              </span>

                              {
                                selectedTable
                                  .reservation
                                  .user
                                  .email
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NOTES */}
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="font-label-sm text-[11px] font-semibold uppercase text-outline">
                        Floor Notes
                      </span>

                      <p className="rounded-lg bg-surface-container-lowest p-3 font-body-md text-body-md text-on-surface-variant">
                        {selectedTable
                          .reservation
                          ?.special_requests ||
                          selectedTable
                            .reservation
                            ?.notes ||
                          selectedTable
                            .table
                            .description ||
                          "No special notes recorded for this table."}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={
                        handlePrimaryAction
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {normalizeStatus(
                          selectedTable.status
                        ) === "available"
                          ? "person_add"
                          : normalizeStatus(
                              selectedTable.status
                            ) === "reserved"
                          ? "how_to_reg"
                          : normalizeStatus(
                              selectedTable.status
                            ) === "turnover" ||
                            normalizeStatus(
                              selectedTable.status
                            ) === "cleaning"
                          ? "cleaning_services"
                          : "check_circle"}
                      </span>

                      <span>
                        {primaryActionText}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          handleTableStatus(
                            selectedTable.table,
                            "turnover"
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 font-label-md text-label-md font-medium text-on-surface transition-all hover:bg-surface-container disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          cleaning_services
                        </span>

                        <span>
                          Turnover
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          handleTableStatus(
                            selectedTable.table,
                            "available"
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 font-label-md text-label-md font-medium text-on-surface transition-all hover:bg-surface-container disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          done
                        </span>

                        <span>
                          Mark Open
                        </span>
                      </button>
                    </div>

                    {selectedTable
                      .reservation &&
                      ["pending", "confirmed"].includes(
                        normalizeStatus(
                          selectedTable
                            .reservation
                            .status
                        )
                      ) && (
                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={() =>
                            handleReservationStatus(
                              selectedTable.reservation!,
                              "declined"
                            )
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-label-md text-label-md font-semibold text-error transition-all hover:bg-error-container/40 disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            close
                          </span>

                          Release Reservation
                        </button>
                      )}
                  </div>

                  {/* PAGING */}
                  <div className="flex items-center gap-3 rounded-xl bg-primary-fixed/20 p-3">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      notifications
                    </span>

                    <span className="font-label-sm text-[12px] text-on-primary-fixed-variant">
                      Table{" "}
                      <strong>
                        {getTableLabel(
                          selectedTable.table
                        )}
                      </strong>{" "}
                      is connected to the live floor
                      operations feed.
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-5xl text-outline">
                    table_restaurant
                  </span>

                  <h3 className="mt-4 font-headline-sm text-headline-sm text-primary">
                    Select a table
                  </h3>

                  <p className="mt-2 max-w-sm font-label-sm text-label-sm text-on-surface-variant">
                    Choose a table from the floor
                    layout to inspect its current
                    status and reservation.
                  </p>
                </div>
              )}
            </section>

            {/* FLOOR BALANCE */}
            <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-[0_2px_12px_rgba(1,38,31,0.02)]">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-semibold text-primary">
                  Floor Balance
                </span>

                <span className="font-label-sm text-label-sm text-outline">
                  {zones.length} Zones
                </span>
              </div>

              <div className="flex flex-col gap-4 pt-1">
                {zones.length === 0 ? (
                  <p className="font-label-sm text-label-sm text-outline">
                    No floor zones configured.
                  </p>
                ) : (
                  zones.map((zone) => {
                    const zoneTables =
                      tableView.filter(
                        ({ table }) =>
                          getTableZone(
                            table
                          ) === zone
                      );

                    const occupied =
                      zoneTables.filter(
                        ({ status }) =>
                          [
                            "seated",
                            "occupied",
                          ].includes(
                            normalizeStatus(
                              status
                            )
                          )
                      ).length;

                    const percentage =
                      zoneTables.length
                        ? Math.round(
                            (occupied /
                              zoneTables.length) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={zone}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-label-sm text-label-sm font-medium text-on-surface">
                            {zone}
                          </span>

                          <span className="whitespace-nowrap font-label-sm text-label-sm font-bold text-primary">
                            {occupied}/
                            {
                              zoneTables.length
                            }{" "}
                            occupied
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* WALK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-widest text-tertiary">
                  Quick Operation
                </span>

                <h2 className="mt-1 font-headline-md text-headline-md text-primary">
                  Walk-in Seating
                </h2>

                <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
                  Start a walk-in seating operation
                  from the floor.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowWalkInModal(false)
                }
                className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="walk-in-guests"
                  className="font-label-md text-label-md font-semibold text-on-surface"
                >
                  Guest name / party size
                </label>

                <input
                  id="walk-in-guests"
                  type="text"
                  value={walkInGuests}
                  onChange={(event) =>
                    setWalkInGuests(
                      event.target.value
                    )
                  }
                  placeholder="Example: Bethlehem G. — 3 guests"
                  className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-label-md text-label-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="rounded-xl bg-primary-fixed/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary">
                    info
                  </span>

                  <p className="font-label-sm text-label-sm text-on-primary-fixed-variant">
                    The current Laravel API does not
                    expose a dedicated staff walk-in
                    reservation endpoint. This screen
                    therefore will not create a fake
                    reservation or guest record.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowWalkInModal(false)
                  }
                  className="rounded-xl bg-surface-container-low px-5 py-3 font-label-md text-label-md font-semibold text-on-surface transition hover:bg-surface-container"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!walkInGuests.trim()}
                  onClick={
                    handleWalkIn
                  }
                  className="rounded-xl bg-primary px-5 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}