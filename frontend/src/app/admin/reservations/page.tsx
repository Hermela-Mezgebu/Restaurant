"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

type User = {
  id: number;
  name: string;
  email: string;
  role: "diner" | "staff" | "admin";
  restaurant_id?: number | null;
  is_active?: boolean;
};

type Restaurant = {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  is_active?: boolean;
  approved?: boolean;
};

type RawReservation = {
  id: number;
  restaurant_id?: number | null;
  user_id?: number | null;
  table_id?: number | null;
  reservation_date?: string | null;
  reservation_time?: string | null;
  date?: string | null;
  time?: string | null;
  party_size?: number | null;
  status?: string | null;
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
    city?: string | null;
  } | null;
  table?: {
    id?: number;
    table_number?: string | number | null;
    capacity?: number | null;
    status?: string | null;
  } | null;
};

type Reservation = {
  id: number;
  restaurantId: number | null;
  restaurantName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  date: string;
  time: string;
  partySize: number;
  table: string;
  notes: string;
  specialRequests: string;
  status: string;
};

type Envelope<T> = {
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

function dataOf<T>(r: unknown): T | null {
  if (!r) return null;

  if (
    typeof r === "object" &&
    r !== null &&
    "data" in r
  ) {
    return ((r as Envelope<T>).data ?? null) as T | null;
  }

  return r as T;
}

function collection<T>(r: unknown): T[] {
  const d = dataOf<unknown>(r);

  if (Array.isArray(d)) {
    return d as T[];
  }

  if (
    d &&
    typeof d === "object" &&
    "data" in d &&
    Array.isArray((d as Paginated<T>).data)
  ) {
    return (d as Paginated<T>).data;
  }

  if (
    r &&
    typeof r === "object" &&
    "data" in r &&
    Array.isArray((r as Paginated<T>).data)
  ) {
    return (r as Paginated<T>).data;
  }

  return [];
}

function s(...v: unknown[]) {
  for (const x of v) {
    if (typeof x === "string" && x.trim()) {
      return x.trim();
    }

    if (typeof x === "number") {
      return String(x);
    }
  }

  return "";
}

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalize(
  r: RawReservation,
  restaurant?: Restaurant
): Reservation {
  return {
    id: r.id,
    restaurantId:
      r.restaurant_id ??
      r.restaurant?.id ??
      restaurant?.id ??
      null,
    restaurantName:
      s(r.restaurant?.name, restaurant?.name) || "Restaurant",
    guestName:
      s(r.user?.name) || `Customer #${r.user_id ?? ""}`,
    guestEmail: s(r.user?.email),
    guestPhone: s(r.user?.phone),
    date: s(r.reservation_date, r.date),
    time: s(r.reservation_time, r.time),
    partySize: n(r.party_size),
    table:
      s(r.table?.table_number, r.table_id) || "Unassigned",
    notes: s(r.notes),
    specialRequests: s(r.special_requests),
    status: s(r.status) || "pending",
  };
}

function dateText(v: string) {
  if (!v) return "—";

  const d = new Date(`${v}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? v
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
}

function timeText(v: string) {
  if (!v) return "—";

  const p = v.split(":");

  if (p.length < 2) return v;

  const h = Number(p[0]);

  return Number.isFinite(h)
    ? `${h % 12 || 12}:${p[1]} ${h >= 12 ? "PM" : "AM"}`
    : v;
}

function statusClass(x: string) {
  switch (x) {
    case "pending":
      return "bg-[#ffb59a] text-[#380d00]";

    case "confirmed":
      return "bg-[#ffe088] text-[#241a00]";

    case "seated":
      return "bg-[#c5eadf] text-[#00201a]";

    case "completed":
      return "bg-[#e5e2e1] text-[#1c1b1b]";

    case "declined":
    case "cancelled":
      return "bg-[#ffdad6] text-[#93000a]";

    default:
      return "bg-[#f0edec] text-[#1c1b1b]";
  }
}

function icon(x: string) {
  return x === "pending"
    ? "schedule"
    : x === "confirmed"
      ? "event_available"
      : x === "seated"
        ? "restaurant"
        : x === "completed"
          ? "task_alt"
          : x === "declined" || x === "cancelled"
            ? "cancel"
            : "info";
}

function initials(v: string) {
  return (
    v
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "A"
  );
}

export default function AdminReservationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [restaurant, setRestaurant] = useState("ALL");
  const [date, setDate] = useState("ALL");

  const [selected, setSelected] =
    useState<Reservation | null>(null);
  const [decline, setDecline] =
    useState<Reservation | null>(null);
  const [reason, setReason] = useState("Capacity");
  const [updating, setUpdating] = useState<number | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const toastMsg = useCallback(
    (
      message: string,
      type: "success" | "error" = "success"
    ) => {
      setToast({ message, type });

      window.setTimeout(() => {
        setToast(null);
      }, 3500);
    },
    []
  );

  const load = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      try {
        const u = getUser() as User | null;

        if (!u) {
          location.href = "/login";
          return;
        }

        if (u.role !== "admin") {
          location.href = "/restaurants";
          return;
        }

        setUser(u);

        const rr = await apiFetch<
          Envelope<Restaurant[] | Paginated<Restaurant>>
        >("/admin/restaurants");

        const rs = collection<Restaurant>(rr);

        setRestaurants(rs);

        const all = await Promise.all(
          rs.map(async (r) => {
            try {
              const x = await apiFetch<
                Envelope<
                  RawReservation[] | Paginated<RawReservation>
                >
              >(`/restaurants/${r.id}/reservations`);

              return collection<RawReservation>(x).map((v) =>
                normalize(v, r)
              );
            } catch (e) {
              console.error(
                `Reservations for restaurant ${r.id}`,
                e
              );

              return [];
            }
          })
        );

        const merged = all
          .flat()
          .sort((a, b) =>
            `${b.date} ${b.time}`.localeCompare(
              `${a.date} ${a.time}`
            )
          );

        setReservations(merged);
      } catch (e) {
        console.error(e);

        setError(
          e instanceof Error
            ? e.message
            : "Unable to load reservations."
        );

        setReservations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (r: Reservation, newStatus: string) => {
      setUpdating(r.id);

      try {
        await apiFetch(`/reservations/${r.id}/status`, {
          method: "PUT",
          body: JSON.stringify({
            status: newStatus,
          }),
        });

        setReservations((x) =>
          x.map((v) =>
            v.id === r.id
              ? {
                  ...v,
                  status: newStatus,
                }
              : v
          )
        );

        setSelected((x) =>
          x?.id === r.id
            ? {
                ...x,
                status: newStatus,
              }
            : x
        );

        setDecline(null);

        toastMsg(
          `Reservation #${r.id} marked ${newStatus}.`
        );
      } catch (e) {
        toastMsg(
          e instanceof Error
            ? e.message
            : "Unable to update reservation.",
          "error"
        );
      } finally {
        setUpdating(null);
      }
    },
    [toastMsg]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    return reservations.filter(
      (r) =>
        (!q ||
          [
            r.id,
            r.restaurantName,
            r.guestName,
            r.guestEmail,
            r.guestPhone,
            r.table,
            r.notes,
            r.specialRequests,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        (status === "ALL" || r.status === status) &&
        (restaurant === "ALL" ||
          String(r.restaurantId) === restaurant) &&
        (date === "ALL" ||
          (date === "TODAY" && r.date === today) ||
          (date === "UPCOMING" &&
            r.date >= today &&
            ![
              "cancelled",
              "declined",
              "completed",
            ].includes(r.status)))
    );
  }, [
    reservations,
    search,
    status,
    restaurant,
    date,
  ]);

  const stats = useMemo(
    () => ({
      total: reservations.length,
      pending: reservations.filter(
        (r) => r.status === "pending"
      ).length,
      confirmed: reservations.filter(
        (r) => r.status === "confirmed"
      ).length,
      seated: reservations.filter(
        (r) => r.status === "seated"
      ).length,
      completed: reservations.filter(
        (r) => r.status === "completed"
      ).length,
      covers: reservations.reduce(
        (a, r) => a + r.partySize,
        0
      ),
    }),
    [reservations]
  );

  const exportCsv = () => {
    const h = [
      "ID",
      "Restaurant",
      "Guest",
      "Email",
      "Phone",
      "Date",
      "Time",
      "Party Size",
      "Table",
      "Status",
      "Notes",
      "Special Requests",
    ];

    const rows = filtered.map((r) =>
      [
        r.id,
        r.restaurantName,
        r.guestName,
        r.guestEmail,
        r.guestPhone,
        r.date,
        r.time,
        r.partySize,
        r.table,
        r.status,
        r.notes,
        r.specialRequests,
      ]
        .map(
          (v) =>
            `"${String(v ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    );

    const blob = new Blob(
      [[h.join(","), ...rows].join("\n")],
      {
        type: "text/csv;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `dineet-reservations-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);

    toastMsg("Reservation data exported.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcf9f8]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#c5eadf] border-t-[#01261f]" />
          <p className="mt-4 text-sm text-[#717976]">
            Loading reservation operations…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b]">
      <AdminSidebar />

      <div className="lg:pl-22">
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-[#ebe7e7] bg-[#fcf9f8]/90 px-5 py-3 backdrop-blur-xl lg:px-16">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#01261f] ring-4 ring-[#c5eadf]" />
              <span className="text-sm font-bold text-[#01261f]">
                Reservation Operations
              </span>
            </div>

            <div className="mt-0.5 text-xs text-[#717976]">
              Live Laravel API data • {restaurants.length} venues
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-[#717976] shadow-sm disabled:opacity-60"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  refreshing ? "animate-spin" : ""
                }`}
              >
                sync
              </span>

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">
                {user?.name || "Administrator"}
              </div>

              <div className="text-[10px] font-medium text-[#934a2d]">
                Platform Admin
              </div>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#01261f] text-xs font-bold text-white">
              {initials(user?.name || "Admin")}
            </div>
          </div>
        </header>

        <main>
          <div className="border-b border-[#ebe7e7] bg-white px-5 py-3 lg:px-16">
            <nav className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-[#f6f3f2] p-1">
              <a
                href="/admin"
                className="shrink-0 rounded-lg px-3 py-2 text-xs text-[#717976] hover:bg-[#ebe7e7]"
              >
                Overview
              </a>

              <a
                href="/admin/reservations"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#01261f] px-3 py-2 text-xs font-semibold text-white"
              >
                Reservations

                <span className="rounded-full bg-[#934a2d] px-1.5 py-0.5 text-[9px]">
                  {stats.pending}
                </span>
              </a>

              <a
                href="/admin/restaurants"
                className="shrink-0 rounded-lg px-3 py-2 text-xs text-[#717976] hover:bg-[#ebe7e7]"
              >
                Restaurants
              </a>

              <a
                href="/admin/users"
                className="shrink-0 rounded-lg px-3 py-2 text-xs text-[#717976] hover:bg-[#ebe7e7]"
              >
                Users
              </a>
            </nav>
          </div>

          <div className="bg-[#1a3c34] px-5 py-2.5 text-[#c5eadf] lg:px-16">
            <div className="flex flex-wrap justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[15px] text-[#ffe088]">
                  update
                </span>

                <b className="uppercase tracking-wider">
                  Live Reservations
                </b>

                <span>
                  • {stats.total} bookings synchronized
                </span>
              </div>

              <div>
                {stats.covers} covers • {stats.pending} awaiting action
              </div>
            </div>
          </div>

          <div className="px-5 py-6 lg:px-16">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#934a2d]">
                  Platform Operations
                </span>

                <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#01261f]">
                  Reservation Management System
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#717976]">
                  Monitor reservations across the DINEET restaurant
                  network, inspect guest details, and update reservation
                  states through Laravel.
                </p>
              </div>

              <button
                onClick={exportCsv}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#01261f] px-3 text-xs font-semibold text-white"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Export CSV
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-[#ffdad6] bg-[#fff4f2] p-4 text-sm text-[#93000a]">
                <b>
                  Reservation data could not be loaded.
                </b>

                <div className="mt-1 text-xs text-[#717976]">
                  {error}
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Total Bookings", stats.total, "calendar_month"],
                ["Pending", stats.pending, "schedule"],
                ["Confirmed", stats.confirmed, "event_available"],
                ["Seated", stats.seated, "restaurant"],
                ["Completed", stats.completed, "task_alt"],
              ].map(([label, value, ico]) => (
                <div
                  key={String(label)}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[#717976]">
                    <span>{label}</span>

                    <span className="material-symbols-outlined text-[20px] text-[#01261f]">
                      {ico}
                    </span>
                  </div>

                  <div className="mt-3 font-serif text-3xl font-bold text-[#01261f]">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#717976]">
                    search
                  </span>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search guest, phone, email, ID, table, or restaurant…"
                    className="w-full rounded-lg bg-[#f6f3f2] py-2.5 pl-10 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#c5eadf]"
                  />
                </div>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg bg-[#f6f3f2] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="seated">Seated</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                  className="rounded-lg bg-[#f6f3f2] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="ALL">All restaurants</option>

                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg bg-[#f6f3f2] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="ALL">All dates</option>
                  <option value="TODAY">Today</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>

                <button
                  onClick={() => {
                    setSearch("");
                    setStatus("ALL");
                    setRestaurant("ALL");
                    setDate("ALL");
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-[#934a2d] hover:bg-[#ffdbcf]"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 border-t border-[#ebe7e7] pt-3 text-xs text-[#717976]">
                Showing{" "}
                <b className="text-[#1c1b1b]">
                  {filtered.length}
                </b>{" "}
                of{" "}
                <b className="text-[#1c1b1b]">
                  {reservations.length}
                </b>{" "}
                reservations
              </div>
            </div>

            <section className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b border-[#ebe7e7] p-5">
                <h2 className="font-serif text-xl font-semibold text-[#01261f]">
                  Network Reservations
                </h2>

                <p className="mt-1 text-xs text-[#717976]">
                  Real reservations returned by the connected Laravel
                  backend.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f6f3f2] text-[10px] font-semibold uppercase tracking-wider text-[#717976]">
                      <th className="px-5 py-3">
                        Date / Time
                      </th>
                      <th className="px-5 py-3">
                        Guest / Contact
                      </th>
                      <th className="px-5 py-3">
                        Restaurant
                      </th>
                      <th className="px-5 py-3">
                        Party
                      </th>
                      <th className="px-5 py-3">
                        Table
                      </th>
                      <th className="px-5 py-3">
                        Notes
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#ebe7e7]">
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-16 text-center"
                        >
                          <span className="material-symbols-outlined text-4xl text-[#717976]">
                            event_busy
                          </span>

                          <div className="mt-2 text-sm font-bold text-[#01261f]">
                            No reservations found
                          </div>

                          <div className="mt-1 text-xs text-[#717976]">
                            Try changing the filters or refresh the feed.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-[#f6f3f2]/70"
                        >
                          <td className="px-5 py-4">
                            <b className="text-[#01261f]">
                              {timeText(r.time)}
                            </b>

                            <div className="text-[11px] text-[#717976]">
                              {dateText(r.date)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelected(r)}
                              className="text-left"
                            >
                              <b className="hover:text-[#934a2d] hover:underline">
                                {r.guestName}
                              </b>

                              <div className="text-[11px] text-[#717976]">
                                {r.guestPhone ||
                                  r.guestEmail ||
                                  `Reservation #${r.id}`}
                              </div>
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <div className="max-w-[190px] truncate text-xs font-semibold text-[#01261f]">
                              {r.restaurantName}
                            </div>

                            <div className="font-mono text-[10px] text-[#717976]">
                              #{r.id}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded bg-[#f0edec] px-2 py-1 text-xs font-semibold">
                              {r.partySize}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono text-xs font-semibold text-[#01261f]">
                            {r.table}
                          </td>

                          <td className="max-w-[230px] px-5 py-4">
                            <div className="truncate text-xs">
                              {r.notes || "No reservation notes"}
                            </div>

                            {r.specialRequests && (
                              <div className="mt-1 truncate text-[10px] text-[#934a2d]">
                                {r.specialRequests}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusClass(
                                r.status
                              )}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {icon(r.status)}
                              </span>

                              {r.status.replaceAll("_", " ")}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {r.status === "pending" && (
                                <>
                                  <button
                                    disabled={updating === r.id}
                                    onClick={() =>
                                      update(r, "confirmed")
                                    }
                                    className="rounded bg-[#01261f] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>

                                  <button
                                    disabled={updating === r.id}
                                    onClick={() =>
                                      setDecline(r)
                                    }
                                    className="rounded bg-[#f0edec] px-2.5 py-1.5 text-[10px] font-bold text-[#717976] hover:bg-[#ffdad6] disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {r.status === "confirmed" && (
                                <button
                                  disabled={updating === r.id}
                                  onClick={() =>
                                    update(r, "seated")
                                  }
                                  className="rounded bg-[#934a2d] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                                >
                                  Seat
                                </button>
                              )}

                              {r.status === "seated" && (
                                <button
                                  disabled={updating === r.id}
                                  onClick={() =>
                                    update(r, "completed")
                                  }
                                  className="rounded bg-[#e5e2e1] px-2.5 py-1.5 text-[10px] font-bold text-[#01261f] disabled:opacity-50"
                                >
                                  Complete
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  setSelected(r)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#f0edec]"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  more_vert
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-70">
          <button
            aria-label="Close"
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-[#313030]/40 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col justify-between overflow-y-auto bg-white p-6 shadow-2xl">
            <div>
              <div className="flex items-start justify-between border-b border-[#ebe7e7] pb-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#717976]">
                    Reservation Profile
                  </div>

                  <h2 className="mt-1 font-serif text-2xl font-bold text-[#01261f]">
                    {selected.guestName}
                  </h2>

                  <div className="font-mono text-[10px] text-[#717976]">
                    Reservation #{selected.id}
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0edec]"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>
              </div>

              <div className="mt-5 flex justify-center rounded-xl bg-[#f6f3f2] p-4">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(
                    selected.status
                  )}`}
                >
                  {selected.status}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-[#f6f3f2] p-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#717976]">
                    Restaurant
                  </div>

                  <b>{selected.restaurantName}</b>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f6f3f2] p-4">
                    <div className="text-[10px] uppercase text-[#717976]">
                      Date
                    </div>

                    <b>{dateText(selected.date)}</b>
                  </div>

                  <div className="rounded-xl bg-[#f6f3f2] p-4">
                    <div className="text-[10px] uppercase text-[#717976]">
                      Time
                    </div>

                    <b>{timeText(selected.time)}</b>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f6f3f2] p-4">
                    <div className="text-[10px] uppercase text-[#717976]">
                      Party
                    </div>

                    <b>{selected.partySize} Pax</b>
                  </div>

                  <div className="rounded-xl bg-[#f6f3f2] p-4">
                    <div className="text-[10px] uppercase text-[#717976]">
                      Table
                    </div>

                    <b className="font-mono">
                      {selected.table}
                    </b>
                  </div>
                </div>

                <div className="rounded-xl bg-[#f6f3f2] p-4">
                  <div className="text-[10px] uppercase text-[#717976]">
                    Guest Contact
                  </div>

                  <b>
                    {selected.guestEmail ||
                      "No email provided"}
                  </b>

                  <div className="text-xs text-[#717976]">
                    {selected.guestPhone ||
                      "No phone provided"}
                  </div>
                </div>

                <div className="rounded-xl bg-[#f6f3f2] p-4">
                  <div className="text-[10px] uppercase text-[#717976]">
                    Notes
                  </div>

                  <p className="mt-1 text-sm">
                    {selected.notes ||
                      "No notes recorded."}
                  </p>
                </div>

                {selected.specialRequests && (
                  <div className="rounded-xl border border-[#ffdbcf] bg-[#fff7f4] p-4">
                    <div className="text-[10px] uppercase text-[#934a2d]">
                      Special Requests
                    </div>

                    <p className="mt-1 text-sm">
                      {selected.specialRequests}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-[#ebe7e7] pt-5">
              {selected.status === "pending" && (
                <>
                  <button
                    disabled={updating === selected.id}
                    onClick={() =>
                      update(selected, "confirmed")
                    }
                    className="w-full rounded-lg bg-[#01261f] py-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Confirm Reservation
                  </button>

                  <button
                    disabled={updating === selected.id}
                    onClick={() => setDecline(selected)}
                    className="w-full rounded-lg bg-[#ffdad6] py-3 text-xs font-bold text-[#93000a] disabled:opacity-50"
                  >
                    Decline Reservation
                  </button>
                </>
              )}

              {selected.status === "confirmed" && (
                <button
                  disabled={updating === selected.id}
                  onClick={() =>
                    update(selected, "seated")
                  }
                  className="w-full rounded-lg bg-[#934a2d] py-3 text-xs font-bold text-white disabled:opacity-50"
                >
                  Seat Guest
                </button>
              )}

              {selected.status === "seated" && (
                <button
                  disabled={updating === selected.id}
                  onClick={() =>
                    update(selected, "completed")
                  }
                  className="w-full rounded-lg bg-[#e5e2e1] py-3 text-xs font-bold text-[#01261f] disabled:opacity-50"
                >
                  Mark Service Complete
                </button>
              )}

              <button
                onClick={() => setSelected(null)}
                className="w-full rounded-lg bg-[#f0edec] py-3 text-xs font-semibold"
              >
                Close Panel
              </button>
            </div>
          </aside>
        </div>
      )}

      {decline && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <button
            aria-label="Close"
            onClick={() => setDecline(null)}
            className="absolute inset-0 bg-[#313030]/50 backdrop-blur-sm"
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[28px]">
                warning
              </span>

              <h2 className="font-serif text-xl font-bold">
                Decline Reservation
              </h2>
            </div>

            <p className="mt-3 text-xs text-[#717976]">
              Declining reservation #{decline.id} for{" "}
              <b className="text-[#1c1b1b]">
                {decline.guestName}
              </b>
              .
            </p>

            <label className="mt-5 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717976]">
                Reason
              </span>

              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#f6f3f2] px-3 py-2.5 text-sm outline-none"
              >
                <option>Capacity</option>
                <option>Restaurant unavailable</option>
                <option>Requested time unavailable</option>
                <option>Other</option>
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDecline(null)}
                className="rounded-lg px-4 py-2.5 text-xs font-semibold text-[#717976] hover:bg-[#f0edec]"
              >
                Keep Booking
              </button>

              <button
                disabled={updating === decline.id}
                onClick={() =>
                  update(decline, "declined")
                }
                className="rounded-lg bg-[#ba1a1a] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>

            <p className="mt-4 text-[10px] leading-4 text-[#717976]">
              The current status endpoint accepts the new status.
              The selected reason is not sent because the current
              backend reservation-status API does not expose a
              decline-reason field.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-70 max-w-sm rounded-xl bg-[#01261f] px-4 py-3 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined ${
                toast.type === "error"
                  ? "text-[#ffb4ab]"
                  : "text-[#ffe088]"
              }`}
            >
              {toast.type === "error"
                ? "error"
                : "check_circle"}
            </span>

            <span className="text-xs font-medium">
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}