"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  restaurant_id?: number | null;
  is_active?: boolean | number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Reservation = {
  id: number;
  user_id?: number | null;
  restaurant_id?: number | null;
  reservation_date?: string | null;
  date?: string | null;
  reservation_time?: string | null;
  time?: string | null;
  party_size?: number | null;
  guests?: number | null;
  status?: string | null;
  total_amount?: number | string | null;
  amount?: number | string | null;
  created_at?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token")
  );
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let body: unknown = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  return [];
}

function getActive(value: User["is_active"]) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "active"
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${
      parts[parts.length - 1][0]
    }`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getReservationDate(reservation: Reservation) {
  return (
    reservation.reservation_date ||
    reservation.date ||
    reservation.created_at ||
    null
  );
}

function getReservationGuests(reservation: Reservation) {
  return reservation.party_size ?? reservation.guests ?? 0;
}

function getReservationAmount(reservation: Reservation) {
  const value =
    reservation.total_amount ?? reservation.amount;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getReservationStatus(reservation: Reservation) {
  return String(
    reservation.status || "pending"
  ).toLowerCase();
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [reservationLoading, setReservationLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [showProvisionModal, setShowProvisionModal] =
    useState(false);

  const [showAuditModal, setShowAuditModal] =
    useState(false);

  const [apiOnline, setApiOnline] = useState(false);

  /*
   * Load users from Laravel.
   *
   * GET /api/admin/users
   */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await apiFetch<ApiResponse<unknown>>(
          "/admin/users"
        );

      const list = normalizeArray<User>(
        response.data
      );

      setUsers(list);
      setApiOnline(true);

      if (list.length > 0) {
        setSelectedUser(
          (current) => current || list[0]
        );
      } else {
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(
        "Failed to load admin users:",
        err
      );

      setApiOnline(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users from the API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Load reservations belonging to the selected user.
   *
   * GET /api/admin/users/{id}/reservations
   *
   * If this endpoint does not exist in Laravel, the page
   * intentionally shows no fabricated booking history.
   */
  const loadUserReservations = useCallback(
    async (user: User) => {
      setReservationLoading(true);

      try {
        const response =
          await apiFetch<ApiResponse<unknown>>(
            `/admin/users/${user.id}/reservations`
          );

        setReservations(
          normalizeArray<Reservation>(
            response.data
          )
        );
      } catch {
        setReservations([]);
      } finally {
        setReservationLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUser) {
      loadUserReservations(selectedUser);
    } else {
      setReservations([]);
    }
  }, [selectedUser, loadUserReservations]);

  /*
   * Filter users.
   */
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name
          .toLowerCase()
          .includes(query) ||
        user.email
          .toLowerCase()
          .includes(query) ||
        String(user.phone || "")
          .toLowerCase()
          .includes(query) ||
        String(user.role || "")
          .toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        String(user.role || "").toLowerCase() ===
          roleFilter;

      const active = getActive(user.is_active);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ]);

  /*
   * User statistics.
   */
  const totalUsers = users.length;

  const dinerCount = users.filter(
    (user) =>
      String(user.role || "").toLowerCase() ===
      "diner"
  ).length;

  const staffCount = users.filter(
    (user) =>
      String(user.role || "").toLowerCase() ===
      "staff"
  ).length;

  const adminCount = users.filter(
    (user) =>
      String(user.role || "").toLowerCase() ===
      "admin"
  ).length;

  const activeUsers = users.filter((user) =>
    getActive(user.is_active)
  ).length;

  /*
   * Selected user's recent reservations.
   */
  const selectedUserReservations = useMemo(() => {
    if (!selectedUser) {
      return [];
    }

    return reservations
      .filter((reservation) => {
        if (reservation.user_id === undefined) {
          return true;
        }

        return (
          Number(reservation.user_id) ===
          Number(selectedUser.id)
        );
      })
      .slice(0, 5);
  }, [reservations, selectedUser]);

  /*
   * Reservation metrics for selected user.
   */
  const completedReservations =
    reservations.filter((reservation) => {
      const status =
        getReservationStatus(reservation);

      return (
        status === "completed" ||
        status === "seated" ||
        status === "confirmed"
      );
    }).length;

  const noShowReservations =
    reservations.filter((reservation) => {
      return (
        getReservationStatus(reservation) ===
        "no-show"
      );
    }).length;

  const totalSpend = reservations.reduce(
    (sum, reservation) =>
      sum +
      getReservationAmount(reservation),
    0
  );

  const reliability =
    completedReservations +
      noShowReservations >
    0
      ? Math.round(
          (completedReservations /
            (completedReservations +
              noShowReservations)) *
            100
        )
      : null;

  /*
   * Export currently visible users.
   */
  function exportUsersCsv() {
    if (filteredUsers.length === 0) {
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Role",
      "Restaurant ID",
      "Status",
      "Created At",
    ];

    const rows = filteredUsers.map((user) => [
      user.id,
      user.name,
      user.email,
      user.phone || "",
      user.role || "",
      user.restaurant_id ?? "",
      getActive(user.is_active)
        ? "Active"
        : "Inactive",
      user.created_at || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "reserveease-users.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  function navigate(path: string) {
    router.push(path);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Shared Admin Sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="lg:pl-22">
        {/* Header */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative hidden w-80 md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-slate-400">
                search
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search users..."
                className="w-full rounded-lg border-0 bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-0 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiOnline
                    ? "animate-pulse bg-emerald-500"
                    : "bg-red-500"
                }`}
              />

              <span className="text-xs font-semibold text-slate-700">
                {apiOnline
                  ? "API Online"
                  : "API Offline"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowProvisionModal(true)
              }
              className="hidden items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>

              Add User
            </button>

            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">
                notifications
              </span>
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600">
              <span className="material-symbols-outlined text-white">
                person
              </span>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-400">
            {/* Context header */}
            <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                    Identity & Access Governance
                  </span>

                  <span className="text-slate-300">
                    •
                  </span>

                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Platform User Registry
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Platform Users & Diner Accounts
                </h1>

                <p className="mt-1 max-w-3xl text-sm text-slate-500">
                  Manage registered users,
                  restaurant staff, diners, and
                  platform administrator accounts
                  using live API data.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportUsersCsv}
                  disabled={
                    filteredUsers.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    file_download
                  </span>

                  Export CSV
                </button>

                <button
                  onClick={() =>
                    setShowAuditModal(true)
                  }
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    security_update_good
                  </span>

                  Audit Logins
                </button>

                <button
                  onClick={() =>
                    setShowProvisionModal(true)
                  }
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    person_add
                  </span>

                  Add User
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600">
                    error
                  </span>

                  <div>
                    <p className="font-semibold text-red-900">
                      Unable to load users
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {error}
                    </p>

                    <p className="mt-2 text-xs text-red-600">
                      The page is intentionally
                      not using mock users.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadUsers}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* KPI cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Users"
                value={
                  loading
                    ? "—"
                    : totalUsers.toLocaleString()
                }
                icon="group"
                iconClass="bg-emerald-50 text-emerald-600"
              />

              <StatCard
                title="Registered Diners"
                value={
                  loading
                    ? "—"
                    : dinerCount.toLocaleString()
                }
                icon="person"
                iconClass="bg-amber-50 text-amber-600"
              />

              <StatCard
                title="Restaurant Staff"
                value={
                  loading
                    ? "—"
                    : staffCount.toLocaleString()
                }
                icon="badge"
                iconClass="bg-blue-50 text-blue-600"
              />

              <StatCard
                title="Active Accounts"
                value={
                  loading
                    ? "—"
                    : activeUsers.toLocaleString()
                }
                icon="verified_user"
                iconClass="bg-violet-50 text-violet-600"
              />
            </div>

            {/* Additional summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                label="Administrators"
                value={
                  loading ? "—" : adminCount
                }
                icon="admin_panel_settings"
              />

              <SummaryCard
                label="Selected User Bookings"
                value={
                  selectedUser
                    ? reservationLoading
                      ? "—"
                      : reservations.length
                    : "—"
                }
                icon="event"
              />

              <SummaryCard
                label="Selected User Spend"
                value={
                  selectedUser
                    ? totalSpend > 0
                      ? totalSpend.toLocaleString()
                      : "0"
                    : "—"
                }
                icon="payments"
              />
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              {/* Users registry */}
              <section className="flex min-w-0 flex-col gap-4 xl:col-span-8">
                {/* Filters */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="relative mb-4 md:hidden">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      search
                    </span>

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search users..."
                      className="w-full rounded-lg bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FilterSelect
                      label="Role"
                      value={roleFilter}
                      onChange={setRoleFilter}
                      options={[
                        ["all", "All Roles"],
                        ["diner", "Diner"],
                        ["staff", "Staff"],
                        ["admin", "Admin"],
                      ]}
                    />

                    <FilterSelect
                      label="Account Status"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        [
                          "all",
                          "All Statuses",
                        ],
                        [
                          "active",
                          "Active",
                        ],
                        [
                          "inactive",
                          "Inactive",
                        ],
                      ]}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-225 text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            User
                          </th>

                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Contact
                          </th>

                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Role
                          </th>

                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Restaurant
                          </th>

                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Status
                          </th>

                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Created
                          </th>

                          <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          Array.from({
                            length: 6,
                          }).map(
                            (_, index) => (
                              <tr key={index}>
                                {Array.from({
                                  length: 7,
                                }).map(
                                  (
                                    _,
                                    cell
                                  ) => (
                                    <td
                                      key={
                                        cell
                                      }
                                      className="px-5 py-4"
                                    >
                                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                                    </td>
                                  )
                                )}
                              </tr>
                            )
                          )
                        ) : filteredUsers.length ===
                          0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-5 py-16 text-center"
                            >
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                <span className="material-symbols-outlined text-slate-400">
                                  group_off
                                </span>
                              </div>

                              <p className="mt-3 font-semibold text-slate-900">
                                No users found
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Try changing
                                your search
                                or filters.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(
                            (user) => {
                              const active =
                                getActive(
                                  user.is_active
                                );

                              const selected =
                                selectedUser?.id ===
                                user.id;

                              return (
                                <tr
                                  key={
                                    user.id
                                  }
                                  onClick={() =>
                                    setSelectedUser(
                                      user
                                    )
                                  }
                                  className={`cursor-pointer transition ${
                                    selected
                                      ? "bg-emerald-50/70"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                                        {getInitials(
                                          user.name
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="truncate font-semibold text-slate-900">
                                            {
                                              user.name
                                            }
                                          </span>

                                          {active && (
                                            <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                              verified
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-xs text-slate-500">
                                          ID #
                                          {
                                            user.id
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="max-w-55">
                                      <p className="truncate text-sm font-medium text-slate-800">
                                        {
                                          user.email
                                        }
                                      </p>

                                      <p className="truncate text-xs text-slate-500">
                                        {user.phone ||
                                          "No phone"}
                                      </p>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <RoleBadge
                                      role={
                                        user.role
                                      }
                                    />
                                  </td>

                                  <td className="px-5 py-4">
                                    {user.restaurant_id ? (
                                      <span className="text-sm text-slate-700">
                                        #
                                        {
                                          user.restaurant_id
                                        }
                                      </span>
                                    ) : (
                                      <span className="text-sm text-slate-400">
                                        —
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-5 py-4">
                                    <StatusBadge
                                      active={
                                        active
                                      }
                                    />
                                  </td>

                                  <td className="px-5 py-4 text-sm text-slate-500">
                                    {formatDate(
                                      user.created_at
                                    )}
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={(
                                          event
                                        ) => {
                                          event.stopPropagation();

                                          setSelectedUser(
                                            user
                                          );
                                        }}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                        title="Inspect user"
                                      >
                                        <span className="material-symbols-outlined text-[19px]">
                                          visibility
                                        </span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!loading &&
                    filteredUsers.length >
                      0 && (
                      <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          Showing{" "}
                          <span className="font-semibold text-slate-900">
                            {
                              filteredUsers.length
                            }
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-slate-900">
                            {users.length}
                          </span>{" "}
                          users
                        </p>

                        <button
                          onClick={loadUsers}
                          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            refresh
                          </span>

                          Refresh
                        </button>
                      </div>
                    )}
                </div>
              </section>

              {/* Inspector */}
              <aside className="xl:col-span-4">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-1.5 bg-linear-to-r from-amber-400 via-emerald-500 to-emerald-700" />

                  {!selectedUser ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <span className="material-symbols-outlined text-slate-400">
                          person_search
                        </span>
                      </div>

                      <h3 className="mt-4 font-semibold text-slate-900">
                        Select a user
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Select a user from
                        the registry to
                        inspect their
                        account.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5 p-5">
                      {/* Inspector header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
                            {getInitials(
                              selectedUser.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-slate-900">
                              {
                                selectedUser.name
                              }
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <RoleBadge
                                role={
                                  selectedUser.role
                                }
                              />

                              <span className="font-mono text-xs text-slate-500">
                                #
                                {
                                  selectedUser.id
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Print user"
                          onClick={() =>
                            window.print()
                          }
                        >
                          <span className="material-symbols-outlined">
                            print
                          </span>
                        </button>
                      </div>

                      {/* Contact */}
                      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-[16px]">
                              call
                            </span>

                            Phone
                          </span>

                          <span className="truncate font-medium text-slate-900">
                            {selectedUser.phone ||
                              "Not provided"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-[16px]">
                              mail
                            </span>

                            Email
                          </span>

                          <span className="max-w-52.5 truncate font-medium text-slate-900">
                            {
                              selectedUser.email
                            }
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-[16px]">
                              restaurant
                            </span>

                            Restaurant
                          </span>

                          <span className="font-medium text-slate-900">
                            {selectedUser.restaurant_id
                              ? `#${selectedUser.restaurant_id}`
                              : "None"}
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        <MetricBox
                          label="Bookings"
                          value={
                            reservationLoading
                              ? "—"
                              : reservations.length
                          }
                          icon="event"
                        />

                        <MetricBox
                          label="Completed"
                          value={
                            reservationLoading
                              ? "—"
                              : completedReservations
                          }
                          icon="check_circle"
                        />

                        <MetricBox
                          label="No Shows"
                          value={
                            reservationLoading
                              ? "—"
                              : noShowReservations
                          }
                          icon="event_busy"
                        />

                        <MetricBox
                          label="Reliability"
                          value={
                            reliability ===
                            null
                              ? "—"
                              : `${reliability}%`
                          }
                          icon="verified"
                        />
                      </div>

                      {/* Spend */}
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Reservation
                              Value
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                              {totalSpend.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <span className="material-symbols-outlined">
                              payments
                            </span>
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Based on reservation
                          data returned by
                          the API.
                        </p>
                      </div>

                      {/* Recent bookings */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900">
                            Recent Platform
                            Bookings
                          </h3>

                          <button
                            onClick={() =>
                              navigate(
                                "/admin/reservations"
                              )
                            }
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Full Log
                          </button>
                        </div>

                        {reservationLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map(
                              (item) => (
                                <div
                                  key={item}
                                  className="h-14 animate-pulse rounded-lg bg-slate-100"
                                />
                              )
                            )}
                          </div>
                        ) : selectedUserReservations.length ===
                          0 ? (
                          <div className="rounded-lg bg-slate-50 p-5 text-center">
                            <span className="material-symbols-outlined text-slate-400">
                              event_busy
                            </span>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              No booking
                              history
                              available
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              The API
                              returned no
                              reservations
                              for this
                              user.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedUserReservations.map(
                              (
                                reservation
                              ) => (
                                <div
                                  key={
                                    reservation.id
                                  }
                                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                      <span className="material-symbols-outlined text-[18px]">
                                        restaurant
                                      </span>
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900">
                                        Reservation
                                        #
                                        {
                                          reservation.id
                                        }
                                      </p>

                                      <p className="text-xs text-slate-500">
                                        {formatDate(
                                          getReservationDate(
                                            reservation
                                          )
                                        )}{" "}
                                        •{" "}
                                        {getReservationGuests(
                                          reservation
                                        )}{" "}
                                        Guests
                                      </p>
                                    </div>
                                  </div>

                                  <ReservationStatus
                                    status={getReservationStatus(
                                      reservation
                                    )}
                                  />
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Account governance */}
                      <div>
                        <h3 className="mb-2 font-semibold text-slate-900">
                          Account Governance
                        </h3>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Account Active
                              </p>

                              <p className="text-xs text-slate-500">
                                Current account
                                status
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                getActive(
                                  selectedUser.is_active
                                )
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {getActive(
                                selectedUser.is_active
                              )
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Role
                              </p>

                              <p className="text-xs text-slate-500">
                                Current platform
                                role
                              </p>
                            </div>

                            <RoleBadge
                              role={
                                selectedUser.role
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setShowProvisionModal(
                              true
                            )
                          }
                          className="flex-1 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                        >
                          Manage Account
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setShowAuditModal(true)
                          }
                          className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Audit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* Provision modal */}
      {showProvisionModal && (
        <Modal
          title="Provision New Account"
          onClose={() =>
            setShowProvisionModal(false)
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Account creation should use your
              existing Laravel registration/admin
              API. No account is fabricated by this
              dashboard.
            </p>

            <button
              onClick={() => {
                setShowProvisionModal(false);
                router.push("/register");
              }}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Open Registration
            </button>
          </div>
        </Modal>
      )}

      {/* Audit modal */}
      {showAuditModal && (
        <Modal
          title="Identity Login Audit"
          onClose={() =>
            setShowAuditModal(false)
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Live account information
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Users loaded:{" "}
                <span className="font-semibold text-slate-900">
                  {users.length}
                </span>
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Active accounts:{" "}
                <span className="font-semibold text-slate-900">
                  {activeUsers}
                </span>
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Administrators:{" "}
                <span className="font-semibold text-slate-900">
                  {adminCount}
                </span>
              </p>
            </div>

            <p className="text-xs text-slate-400">
              A dedicated login-audit endpoint is not
              assumed here because it was not part of
              the supplied backend API.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   Reusable components
------------------------------------------------------- */

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {value}
        </p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <span className="material-symbols-outlined text-[20px]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>

        <span className="material-symbols-outlined text-[16px] text-emerald-600">
          {icon}
        </span>
      </div>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="rounded-lg border-0 bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function RoleBadge({
  role,
}: {
  role?: string | null;
}) {
  const normalized = String(
    role || "unknown"
  ).toLowerCase();

  const styles: Record<string, string> = {
    admin:
      "bg-violet-50 text-violet-700",
    staff:
      "bg-blue-50 text-blue-700",
    diner:
      "bg-emerald-50 text-emerald-700",
    unknown:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalized] ||
        styles.unknown
      }`}
    >
      {normalized.charAt(0).toUpperCase() +
        normalized.slice(1)}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-emerald-500"
            : "bg-slate-400"
        }`}
      />

      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ReservationStatus({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  let className =
    "bg-slate-100 text-slate-600";

  if (
    normalized === "confirmed" ||
    normalized === "seated" ||
    normalized === "completed"
  ) {
    className =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "no-show"
  ) {
    className =
      "bg-red-50 text-red-700";
  }

  if (normalized === "pending") {
    className =
      "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}
    >
      {normalized.charAt(0).toUpperCase() +
        normalized.slice(1)}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}