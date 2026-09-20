"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
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
  is_active?: boolean;
  approved?: boolean;
};

type Table = {
  id: number;
  restaurant_id: number;
  table_number?: string | number | null;
  name?: string | null;
  capacity?: number | null;
  seats?: number | null;
  status?: string | null;
  cuisine?: string | null;
  approval_status?: string | null;
  location?: string | null;
  zone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  restaurant?: Restaurant | null;
};

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: "diner" | "staff" | "admin";
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type Paginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

type TableForm = {
  table_number: string;
  capacity: string;
  status: string;
  cuisine: string;
  approval_status: string;
  zone: string;
};

function unwrapData<T>(response: unknown): T | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const value = response as ApiEnvelope<T>;

  if ("data" in value) {
    return value.data ?? null;
  }

  return response as T;
}

function unwrapCollection<T>(response: unknown): T[] {
  const data = unwrapData<unknown>(response);

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Paginated<T>).data)
  ) {
    return (data as Paginated<T>).data;
  }

  return [];
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function tableLabel(table: Table) {
  return table.table_number != null
    ? `Table ${table.table_number}`
    : table.name || `Table #${table.id}`;
}

function normalizedStatus(table: Table) {
  return String(table.status || "available").toLowerCase();
}

function statusLabel(status: string) {
  return status.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "occupied":
    case "seated":
      return "bg-amber-50 text-amber-800 border-amber-200";

    case "reserved":
      return "bg-blue-50 text-blue-800 border-blue-200";

    case "maintenance":
    case "unavailable":
      return "bg-red-50 text-red-800 border-red-200";

    case "cleaning":
      return "bg-purple-50 text-purple-800 border-purple-200";

    default:
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminTablesPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  const [form, setForm] = useState<TableForm>({
    table_number: "",
    capacity: "2",
    status: "available",
    cuisine: "",
    approval_status: "",
    zone: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentUser = getUser() as CurrentUser | null;

      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      if (currentUser.role !== "admin") {
        window.location.href = "/restaurants";
        return;
      }

      setUser(currentUser);

      const restaurantResponse = await apiFetch("/admin/restaurants");

      const restaurantData =
        unwrapCollection<Restaurant>(restaurantResponse);

      setRestaurants(restaurantData);

      const tableResponses = await Promise.all(
        restaurantData.map(async (restaurant) => {
          try {
            const response = await apiFetch(
              `/restaurants/${restaurant.id}/tables`
            );

            return unwrapCollection<Table>(response).map((table) => ({
              ...table,
              restaurant_id: table.restaurant_id || restaurant.id,
              restaurant,
            }));
          } catch (tableError) {
            console.error(
              `Unable to load tables for restaurant ${restaurant.id}`,
              tableError
            );

            return [];
          }
        })
      );

      setTables(tableResponses.flat());
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the table management data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    const available = tables.filter(
      (table) => normalizedStatus(table) === "available"
    ).length;

    const occupied = tables.filter((table) =>
      ["occupied", "seated"].includes(normalizedStatus(table))
    ).length;

    const reserved = tables.filter(
      (table) => normalizedStatus(table) === "reserved"
    ).length;

    const unavailable = tables.filter((table) =>
      ["maintenance", "unavailable"].includes(normalizedStatus(table))
    ).length;

    return {
      total: tables.length,
      available,
      occupied,
      reserved,
      unavailable,
      capacity: tables.reduce(
        (sum, table) =>
          sum + numberValue(table.capacity ?? table.seats),
        0
      ),
      restaurantsWithTables: new Set(
        tables.map((table) => table.restaurant_id)
      ).size,
    };
  }, [tables]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tables.filter((table) => {
      const restaurantName =
        table.restaurant?.name ||
        restaurants.find(
          (restaurant) => restaurant.id === table.restaurant_id
        )?.name ||
        "";

      const matchesSearch =
        !query ||
        tableLabel(table).toLowerCase().includes(query) ||
        restaurantName.toLowerCase().includes(query) ||
        String(table.id).includes(query) ||
        String(table.cuisine || "")
          .toLowerCase()
          .includes(query) ||
        String(table.zone || "")
          .toLowerCase()
          .includes(query);

      const matchesRestaurant =
        restaurantFilter === "all" ||
        String(table.restaurant_id) === restaurantFilter;

      const capacity = numberValue(
        table.capacity ?? table.seats
      );

      const matchesCapacity =
        capacityFilter === "all" ||
        (capacityFilter === "2" && capacity <= 2) ||
        (capacityFilter === "4" &&
          capacity >= 3 &&
          capacity <= 4) ||
        (capacityFilter === "6" &&
          capacity >= 5 &&
          capacity <= 6) ||
        (capacityFilter === "8" && capacity >= 7);

      const matchesStatus =
        statusFilter === "all" ||
        normalizedStatus(table) === statusFilter;

      return (
        matchesSearch &&
        matchesRestaurant &&
        matchesCapacity &&
        matchesStatus
      );
    });
  }, [
    tables,
    restaurants,
    search,
    restaurantFilter,
    statusFilter,
    capacityFilter,
  ]);

  const openEdit = (table: Table) => {
    setEditingTable(table);

    setForm({
      table_number: String(
        table.table_number ?? table.name ?? ""
      ),
      capacity: String(
        table.capacity ?? table.seats ?? 2
      ),
      status: normalizedStatus(table),
      cuisine: String(table.cuisine ?? ""),
      approval_status: String(table.approval_status ?? ""),
      zone: String(
        table.zone ?? table.location ?? ""
      ),
    });
  };

  const saveTable = async () => {
    if (!editingTable) {
      return;
    }

    const capacity = Number(form.capacity);

    if (!form.table_number.trim()) {
      setError("Table number is required.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 1) {
      setError("Capacity must be a positive number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiFetch(
        `/restaurants/${editingTable.restaurant_id}/tables/${editingTable.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            table_number: form.table_number.trim(),
            capacity,
            status: form.status,

            ...(form.cuisine
              ? {
                  cuisine: form.cuisine.trim(),
                }
              : {}),

            ...(form.approval_status
              ? {
                  approval_status:
                    form.approval_status.trim(),
                }
              : {}),

            ...(form.zone
              ? {
                  zone: form.zone.trim(),
                }
              : {}),
          }),
        }
      );

      const returned = unwrapData<Table>(response);

      setTables((current) =>
        current.map((table) =>
          table.id === editingTable.id
            ? {
                ...table,
                ...(returned || {}),
                table_number:
                  returned?.table_number ??
                  form.table_number,
                capacity:
                  returned?.capacity ?? capacity,
                status:
                  returned?.status ?? form.status,
                cuisine:
                  returned?.cuisine ?? form.cuisine,
                approval_status:
                  returned?.approval_status ??
                  form.approval_status,
                zone:
                  returned?.zone ?? form.zone,
              }
            : table
        )
      );

      setSelectedTable(null);
      setEditingTable(null);
      setNotice("Table updated successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the table."
      );
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "Table",
        "Restaurant",
        "Capacity",
        "Status",
        "Cuisine",
        "Approval",
        "Zone",
      ],

      ...filteredTables.map((table) => [
        tableLabel(table),

        table.restaurant?.name ||
          restaurants.find(
            (restaurant) =>
              restaurant.id === table.restaurant_id
          )?.name ||
          "",

        numberValue(
          table.capacity ?? table.seats
        ),

        normalizedStatus(table),

        table.cuisine || "",

        table.approval_status || "",

        table.zone || table.location || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map(csvEscape).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download = `dineet-admin-tables-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const restaurantName = (table: Table) =>
    table.restaurant?.name ||
    restaurants.find(
      (restaurant) =>
        restaurant.id === table.restaurant_id
    )?.name ||
    `Restaurant #${table.restaurant_id}`;

  const clearFilters = () => {
    setSearch("");
    setRestaurantFilter("all");
    setStatusFilter("all");
    setCapacityFilter("all");
  };

  if (!user && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f3f2]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#d8dfdc] border-t-[#01261f]" />

          <p className="text-sm font-medium text-[#1a3c34]">
            Loading table operations…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3f2] text-[#01261f]">
      <div className="flex min-h-screen">
        {/* Shared admin navigation */}
        <AdminSidebar />

        <section className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-[#e4e8e5] bg-[#fcf9f8]/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f7774]">
                    Admin / Operations

                    <span>•</span>

                    Tables
                  </div>

                  <h1 className="truncate font-serif text-xl font-semibold sm:text-2xl">
                    Table & Floor Management
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="hidden items-center gap-2 rounded-xl border border-[#dce2df] bg-white px-3 py-2 text-sm font-semibold text-[#1a3c34] shadow-sm transition hover:bg-[#f5f7f6] disabled:opacity-50 sm:flex"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    refresh
                  </span>

                  Refresh
                </button>

                <button
                  onClick={exportCsv}
                  disabled={!filteredTables.length}
                  className="flex items-center gap-2 rounded-xl bg-[#01261f] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a3c34] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>

                  <span className="hidden sm:inline">
                    Export
                  </span>
                </button>

                <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#934a2d] text-sm font-bold text-white sm:flex">
                  {user?.name?.slice(0, 1).toUpperCase() ||
                    "A"}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-375 px-4 py-6 sm:px-6 lg:px-8">
            {/* Hero */}
            <div className="mb-6 overflow-hidden rounded-2xl bg-[#01261f] px-5 py-6 text-white shadow-sm sm:px-7">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div className="max-w-2xl">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                    Live platform inventory
                  </div>

                  <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                    Every table, one control surface.
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">
                    Monitor table capacity and operational
                    status across every approved restaurant.
                    Select a table to inspect or update its
                    configuration.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/60">
                    Total seating capacity
                  </div>

                  <div className="mt-1 text-3xl font-semibold">
                    {stats.capacity}

                    <span className="ml-2 text-sm font-normal text-emerald-100/60">
                      seats
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span className="material-symbols-outlined text-[20px]">
                  error
                </span>

                <div className="flex-1">
                  {error}
                </div>

                <button
                  onClick={() => setError("")}
                  className="font-semibold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Success notification */}
            {notice && (
              <div className="fixed bottom-5 right-5 z-70 flex max-w-sm items-center gap-3 rounded-xl bg-[#01261f] px-4 py-3 text-sm font-semibold text-white shadow-2xl">
                <span className="material-symbols-outlined text-[20px]">
                  check_circle
                </span>

                {notice}
              </div>
            )}

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Total tables",
                  value: stats.total,
                  icon: "table_restaurant",
                  detail: `${stats.restaurantsWithTables} restaurants`,
                },
                {
                  label: "Available",
                  value: stats.available,
                  icon: "event_available",
                  detail: "Ready for booking",
                },
                {
                  label: "Occupied",
                  value: stats.occupied,
                  icon: "groups",
                  detail: "Currently in service",
                },
                {
                  label: "Reserved",
                  value: stats.reserved,
                  icon: "schedule",
                  detail: "Upcoming seating",
                },
                {
                  label: "Unavailable",
                  value: stats.unavailable,
                  icon: "block",
                  detail: "Needs attention",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#e4e8e5] bg-white p-5 shadow-[0_2px_14px_rgba(1,38,31,0.04)]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f7774]">
                        {card.label}
                      </div>

                      <div className="mt-2 text-3xl font-semibold tracking-tight">
                        {card.value}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3f0] text-[#01261f]">
                      <span className="material-symbols-outlined">
                        {card.icon}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-[#6f7774]">
                    {card.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="mt-6 rounded-2xl border border-[#e4e8e5] bg-white p-4 shadow-[0_2px_14px_rgba(1,38,31,0.04)]">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#7c8581]">
                    search
                  </span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search table, restaurant, zone or cuisine…"
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-[#fcfdfc] pl-10 pr-4 text-sm outline-none transition focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </div>

                <select
                  value={restaurantFilter}
                  onChange={(event) =>
                    setRestaurantFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-[#dce2df] bg-[#fcfdfc] px-3 text-sm font-medium outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                >
                  <option value="all">
                    All restaurants
                  </option>

                  {restaurants.map((restaurant) => (
                    <option
                      key={restaurant.id}
                      value={restaurant.id}
                    >
                      {restaurant.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-[#dce2df] bg-[#fcfdfc] px-3 text-sm font-medium outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                >
                  <option value="all">
                    All statuses
                  </option>
                  <option value="available">
                    Available
                  </option>
                  <option value="reserved">
                    Reserved
                  </option>
                  <option value="occupied">
                    Occupied
                  </option>
                  <option value="seated">
                    Seated
                  </option>
                  <option value="cleaning">
                    Cleaning
                  </option>
                  <option value="maintenance">
                    Maintenance
                  </option>
                  <option value="unavailable">
                    Unavailable
                  </option>
                </select>

                <select
                  value={capacityFilter}
                  onChange={(event) =>
                    setCapacityFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-[#dce2df] bg-[#fcfdfc] px-3 text-sm font-medium outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                >
                  <option value="all">
                    Any capacity
                  </option>
                  <option value="2">
                    2 seats
                  </option>
                  <option value="4">
                    3–4 seats
                  </option>
                  <option value="6">
                    5–6 seats
                  </option>
                  <option value="8">
                    7+ seats
                  </option>
                </select>

                <button
                  onClick={clearFilters}
                  className="h-11 rounded-xl px-3 text-sm font-semibold text-[#6f7774] transition hover:bg-[#f0f3f1] hover:text-[#01261f]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Main table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#e4e8e5] bg-white shadow-[0_2px_14px_rgba(1,38,31,0.04)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e4e8e5] px-5 py-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-semibold">
                    Floor inventory
                  </h3>

                  <p className="mt-1 text-xs text-[#6f7774]">
                    Showing {filteredTables.length} of{" "}
                    {tables.length} tables
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6f7774]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />

                  Live operational data
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 7 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-16 animate-pulse rounded-xl bg-[#f1f4f2]"
                      />
                    )
                  )}
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3f0] text-[#01261f]">
                    <span className="material-symbols-outlined text-[28px]">
                      table_restaurant
                    </span>
                  </div>

                  <h3 className="mt-4 font-semibold">
                    No tables found
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm text-[#6f7774]">
                    Try changing the filters or search
                    terms. The page only displays tables
                    returned by the live restaurant table APIs.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="mt-4 rounded-xl bg-[#01261f] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-225">
                      <thead className="bg-[#f8faf9] text-left">
                        <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f7774]">
                          <th className="px-5 py-3">
                            Table
                          </th>

                          <th className="px-5 py-3">
                            Restaurant
                          </th>

                          <th className="px-5 py-3">
                            Capacity
                          </th>

                          <th className="px-5 py-3">
                            Status
                          </th>

                          <th className="px-5 py-3">
                            Configuration
                          </th>

                          <th className="px-5 py-3 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#edf0ee]">
                        {filteredTables.map((table) => {
                          const status =
                            normalizedStatus(table);

                          return (
                            <tr
                              key={`${table.restaurant_id}-${table.id}`}
                              className="transition hover:bg-[#fbfcfb]"
                            >
                              <td className="px-5 py-4">
                                <button
                                  onClick={() =>
                                    setSelectedTable(table)
                                  }
                                  className="text-left"
                                >
                                  <div className="font-semibold text-[#01261f] hover:underline">
                                    {tableLabel(table)}
                                  </div>

                                  <div className="mt-0.5 text-[11px] text-[#7a8380]">
                                    ID #{table.id}
                                  </div>
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <div className="max-w-55 truncate text-sm font-medium">
                                  {restaurantName(table)}
                                </div>

                                <div className="mt-0.5 text-[11px] text-[#7a8380]">
                                  Restaurant #
                                  {table.restaurant_id}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <span className="material-symbols-outlined text-[18px] text-[#934a2d]">
                                    group
                                  </span>

                                  {numberValue(
                                    table.capacity ??
                                      table.seats
                                  )}{" "}
                                  seats
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                    status
                                  )}`}
                                >
                                  {statusLabel(status)}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {table.zone ||
                                  table.location ? (
                                    <span className="rounded-lg bg-[#f0f3f1] px-2 py-1 text-[11px] font-medium text-[#52605c]">
                                      {table.zone ||
                                        table.location}
                                    </span>
                                  ) : null}

                                  {table.cuisine ? (
                                    <span className="rounded-lg bg-[#fbf0eb] px-2 py-1 text-[11px] font-medium text-[#934a2d]">
                                      {table.cuisine}
                                    </span>
                                  ) : null}

                                  {table.approval_status ? (
                                    <span className="rounded-lg bg-[#eef3f0] px-2 py-1 text-[11px] font-medium text-[#52605c]">
                                      {statusLabel(
                                        table.approval_status
                                      )}
                                    </span>
                                  ) : null}

                                  {!table.zone &&
                                    !table.location &&
                                    !table.cuisine &&
                                    !table.approval_status && (
                                      <span className="text-xs text-[#9aa29f]">
                                        Standard configuration
                                      </span>
                                    )}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() =>
                                    openEdit(table)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce2df] px-3 py-2 text-xs font-semibold text-[#1a3c34] transition hover:bg-[#f0f3f1]"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    edit
                                  </span>

                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile table cards */}
                  <div className="divide-y divide-[#edf0ee] md:hidden">
                    {filteredTables.map((table) => {
                      const status =
                        normalizedStatus(table);

                      return (
                        <div
                          key={`${table.restaurant_id}-${table.id}`}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() =>
                                setSelectedTable(table)
                              }
                              className="min-w-0 text-left"
                            >
                              <div className="font-semibold">
                                {tableLabel(table)}
                              </div>

                              <div className="mt-1 truncate text-xs text-[#6f7774]">
                                {restaurantName(table)}
                              </div>
                            </button>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
                                status
                              )}`}
                            >
                              {statusLabel(status)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-[#f8faf9] p-3">
                              <div className="text-[#7a8380]">
                                Capacity
                              </div>

                              <div className="mt-1 font-semibold">
                                {numberValue(
                                  table.capacity ??
                                    table.seats
                                )}{" "}
                                seats
                              </div>
                            </div>

                            <div className="rounded-xl bg-[#f8faf9] p-3">
                              <div className="text-[#7a8380]">
                                Table ID
                              </div>

                              <div className="mt-1 font-semibold">
                                #{table.id}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              openEdit(table)
                            }
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce2df] py-2.5 text-sm font-semibold"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>

                            Edit table
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Details drawer */}
      {selectedTable && (
        <div className="fixed inset-0 z-60">
          <button
            aria-label="Close table details"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedTable(null)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-[#fcf9f8] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e8e5] bg-[#fcf9f8]/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f7774]">
                  Table details
                </div>

                <h2 className="mt-1 text-xl font-semibold">
                  {tableLabel(selectedTable)}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedTable(null)
                }
                className="rounded-xl p-2 hover:bg-[#eef3f0]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-2xl bg-[#01261f] p-5 text-white">
                <div className="text-xs text-emerald-100/60">
                  {restaurantName(selectedTable)}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold">
                      {numberValue(
                        selectedTable.capacity ??
                          selectedTable.seats
                      )}
                    </div>

                    <div className="text-xs text-emerald-100/60">
                      maximum seats
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                      normalizedStatus(selectedTable)
                    )}`}
                  >
                    {statusLabel(
                      normalizedStatus(selectedTable)
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  [
                    "Table ID",
                    `#${selectedTable.id}`,
                  ],
                  [
                    "Restaurant ID",
                    `#${selectedTable.restaurant_id}`,
                  ],
                  [
                    "Zone",
                    selectedTable.zone ||
                      selectedTable.location ||
                      "—",
                  ],
                  [
                    "Cuisine",
                    selectedTable.cuisine || "—",
                  ],
                  [
                    "Approval",
                    selectedTable.approval_status
                      ? statusLabel(
                          selectedTable.approval_status
                        )
                      : "—",
                  ],
                  [
                    "Updated",
                    selectedTable.updated_at
                      ? new Date(
                          selectedTable.updated_at
                        ).toLocaleDateString()
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#e4e8e5] bg-white p-3"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a8380]">
                      {label}
                    </div>

                    <div className="mt-1 break-words text-sm font-semibold">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  openEdit(selectedTable);
                  setSelectedTable(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#01261f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1a3c34]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>

                Edit configuration
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Edit modal */}
      {editingTable && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <button
            aria-label="Close edit dialog"
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              !saving && setEditingTable(null)
            }
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#fcf9f8] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#e4e8e5] px-5 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f7774]">
                  Table configuration
                </div>

                <h2 className="mt-1 text-xl font-semibold">
                  Edit {tableLabel(editingTable)}
                </h2>

                <p className="mt-1 text-xs text-[#6f7774]">
                  {restaurantName(editingTable)}
                </p>
              </div>

              <button
                disabled={saving}
                onClick={() =>
                  setEditingTable(null)
                }
                className="rounded-xl p-2 hover:bg-[#eef3f0] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Table number
                  </span>

                  <input
                    value={form.table_number}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        table_number:
                          event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Capacity
                  </span>

                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        capacity:
                          event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Operational status
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  >
                    <option value="available">
                      Available
                    </option>

                    <option value="reserved">
                      Reserved
                    </option>

                    <option value="occupied">
                      Occupied
                    </option>

                    <option value="seated">
                      Seated
                    </option>

                    <option value="cleaning">
                      Cleaning
                    </option>

                    <option value="maintenance">
                      Maintenance
                    </option>

                    <option value="unavailable">
                      Unavailable
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Zone
                  </span>

                  <input
                    value={form.zone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        zone: event.target.value,
                      }))
                    }
                    placeholder="Main dining, terrace…"
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Cuisine
                  </span>

                  <input
                    value={form.cuisine}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cuisine:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6f7774]">
                    Approval status
                  </span>

                  <input
                    value={form.approval_status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        approval_status:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="h-11 w-full rounded-xl border border-[#dce2df] bg-white px-3 text-sm outline-none focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/10"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-[#e4e8e5] bg-[#f4f7f5] p-3 text-xs leading-5 text-[#52605c]">
                Updates are sent to the restaurant-specific
                table endpoint:

                <span className="ml-1 font-mono text-[11px]">
                  /restaurants/
                  {editingTable.restaurant_id}
                  /tables/
                  {editingTable.id}
                </span>

                . The page never edits another
                restaurant&apos;s table through a different
                restaurant ID.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e4e8e5] p-5 sm:flex-row sm:justify-end">
              <button
                disabled={saving}
                onClick={() =>
                  setEditingTable(null)
                }
                className="rounded-xl border border-[#dce2df] px-4 py-2.5 text-sm font-semibold text-[#52605c] hover:bg-[#f0f3f1] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                onClick={saveTable}
                className="rounded-xl bg-[#01261f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3c34] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}