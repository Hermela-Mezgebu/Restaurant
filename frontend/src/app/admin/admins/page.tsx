"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCopy,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFilter,
  FiKey,
  FiLock,
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import AdminSidebar from "@/components/admin/AdminSidebar";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type Admin = {
  id: number | string;
  name: string;
  email: string;
  role?: string | null;
  is_active?: boolean | number | string | null;
  status?: string | null;
  restaurant_id?: number | string | null;
  restaurant?: {
    id?: number | string;
    name?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
  last_login?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  admins?: T;
  users?: T;
};

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
};

type CreateAdminForm = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  restaurant_id: string;
};

type FilterStatus = "all" | "active" | "suspended";

/* ========================================================================== */
/* API                                                                        */
/* ========================================================================== */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000/api";

function token() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T> | T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token()
        ? {
            Authorization: `Bearer ${token()}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let body: ApiResponse<T> | T | null = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return body;
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function asArray<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }

  if (!body || typeof body !== "object") {
    return [];
  }

  const value = body as Record<string, unknown>;

  if (Array.isArray(value.data)) {
    return value.data as T[];
  }

  if (
    value.data &&
    typeof value.data === "object" &&
    Array.isArray(
      (value.data as Record<string, unknown>).admins
    )
  ) {
    return (
      (value.data as Record<string, unknown>)
        .admins as T[]
    );
  }

  if (Array.isArray(value.admins)) {
    return value.admins as T[];
  }

  if (Array.isArray(value.users)) {
    return value.users as T[];
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      return nestedValue as T[];
    }
  }

  return [];
}

function active(admin: Admin) {
  if (typeof admin.is_active === "boolean") {
    return admin.is_active;
  }

  if (typeof admin.is_active === "number") {
    return admin.is_active === 1;
  }

  if (typeof admin.is_active === "string") {
    return [
      "1",
      "true",
      "active",
    ].includes(admin.is_active.toLowerCase());
  }

  return ![
    "suspended",
    "inactive",
    "disabled",
  ].includes(
    String(admin.status || "").toLowerCase()
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AD"
  );
}

function roleLabel(role?: string | null) {
  if (!role) {
    return "Administrator";
  }

  return role
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function dateLabel(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll(
    '"',
    '""'
  )}"`;
}

function getRestaurantName(admin: Admin) {
  return (
    admin.restaurant?.name ||
    (admin.restaurant_id
      ? `Restaurant #${admin.restaurant_id}`
      : "All restaurants")
  );
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] =
    useState<Admin | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toast, setToast] =
    useState<ToastState | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [form, setForm] =
    useState<CreateAdminForm>({
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role: "admin",
      restaurant_id: "",
    });

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMINS                                                              */
  /* ------------------------------------------------------------------------ */

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<Admin[]>(
        "/admin/admins"
      );

      const normalized = asArray<Admin>(response);

      setAdmins(normalized);

      setSelectedAdmin((current) => {
        if (!current) {
          return normalized[0] || null;
        }

        const refreshed = normalized.find(
          (admin) =>
            String(admin.id) === String(current.id)
        );

        return refreshed || normalized[0] || null;
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load administrators.";

      setError(message);

      notify({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* DERIVED DATA                                                             */
  /* ------------------------------------------------------------------------ */

  const roles = useMemo(() => {
    const values = admins
      .map((admin) => admin.role)
      .filter(
        (role): role is string =>
          Boolean(role)
      );

    return Array.from(new Set(values));
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return admins.filter((admin) => {
      const matchesSearch =
        !normalizedSearch ||
        admin.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        admin.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        roleLabel(admin.role)
          .toLowerCase()
          .includes(normalizedSearch) ||
        getRestaurantName(admin)
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" ||
        String(admin.role || "")
          .toLowerCase() ===
          roleFilter.toLowerCase();

      const isActive = active(admin);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "suspended" &&
          !isActive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    admins,
    roleFilter,
    search,
    statusFilter,
  ]);

  const totalCount = admins.length;

  const activeCount = useMemo(
    () =>
      admins.filter((admin) =>
        active(admin)
      ).length,
    [admins]
  );

  const suspendedCount =
    totalCount - activeCount;

  const superAdminCount = useMemo(
    () =>
      admins.filter((admin) => {
        const role =
          String(admin.role || "")
            .toLowerCase()
            .replace(/[_-]+/g, " ");

        return (
          role === "super admin" ||
          role === "superadmin"
        );
      }).length,
    [admins]
  );

  /* ------------------------------------------------------------------------ */
  /* TOAST                                                                    */
  /* ------------------------------------------------------------------------ */

  function notify(nextToast: ToastState) {
    setToast(nextToast);

    window.setTimeout(() => {
      setToast((current) =>
        current === nextToast
          ? null
          : current
      );
    }, 3200);
  }

  /* ------------------------------------------------------------------------ */
  /* EXPORT                                                                   */
  /* ------------------------------------------------------------------------ */

  function exportCsv() {
    const rows = [
      [
        "ID",
        "Name",
        "Email",
        "Role",
        "Status",
        "Restaurant",
        "Created",
        "Last Login",
      ],
      ...filteredAdmins.map((admin) => [
        admin.id,
        admin.name,
        admin.email,
        roleLabel(admin.role),
        active(admin)
          ? "Active"
          : "Suspended",
        getRestaurantName(admin),
        admin.created_at || "",
        admin.last_login_at ||
          admin.last_login ||
          "",
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

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "reserveease-admins.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    notify({
      type: "success",
      message: `${filteredAdmins.length} administrator${
        filteredAdmins.length === 1
          ? ""
          : "s"
      } exported.`,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE ADMIN                                                             */
  /* ------------------------------------------------------------------------ */

  async function createAdmin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      notify({
        type: "error",
        message:
          "Administrator name is required.",
      });
      return;
    }

    if (!form.email.trim()) {
      notify({
        type: "error",
        message:
          "Administrator email is required.",
      });
      return;
    }

    if (!form.password) {
      notify({
        type: "error",
        message: "Password is required.",
      });
      return;
    }

    if (
      form.password !==
      form.password_confirmation
    ) {
      notify({
        type: "error",
        message:
          "Password confirmation does not match.",
      });
      return;
    }

    setSaving(true);

    try {
      const payload: Record<
        string,
        string
      > = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation:
          form.password_confirmation,
        role: form.role,
      };

      if (form.restaurant_id.trim()) {
        payload.restaurant_id =
          form.restaurant_id.trim();
      }

      const response =
        await apiFetch<Admin>(
          "/admin/admins",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

      const created =
        response &&
        typeof response === "object" &&
        "data" in response &&
        response.data &&
        !Array.isArray(response.data)
          ? (response.data as Admin)
          : null;

      if (created?.id) {
        setAdmins((current) => [
          created,
          ...current,
        ]);

        setSelectedAdmin(created);
      } else {
        await loadAdmins();
      }

      setForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "admin",
        restaurant_id: "",
      });

      setShowCreateModal(false);

      notify({
        type: "success",
        message:
          "Administrator created successfully.",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create administrator.";

      notify({
        type: "error",
        message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* TOGGLE STATUS                                                            */
  /* ------------------------------------------------------------------------ */

  async function toggleSelectedStatus() {
    if (!selectedAdmin) {
      return;
    }

    const nextActive =
      !active(selectedAdmin);

    setSaving(true);

    try {
      const response =
        await apiFetch<Admin>(
          `/admin/admins/${selectedAdmin.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              is_active: nextActive,
            }),
          }
        );

      const responseAdmin =
        response &&
        typeof response === "object" &&
        "data" in response &&
        response.data &&
        !Array.isArray(response.data)
          ? (response.data as Admin)
          : null;

      const updatedAdmin: Admin = {
        ...selectedAdmin,
        ...(responseAdmin || {}),
        is_active: nextActive,
        status: nextActive
          ? "active"
          : "suspended",
      };

      setAdmins((current) =>
        current.map((admin) =>
          String(admin.id) ===
          String(selectedAdmin.id)
            ? updatedAdmin
            : admin
        )
      );

      setSelectedAdmin(updatedAdmin);

      notify({
        type: "success",
        message: nextActive
          ? "Administrator activated."
          : "Administrator suspended.",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to update administrator.";

      notify({
        type: "error",
        message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FORM HELPERS                                                             */
  /* ------------------------------------------------------------------------ */

  function updateForm(
    key: keyof CreateAdminForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  /* ======================================================================== */
  /* RENDER                                                                   */
  /* ======================================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ================================================================== */}
      {/* SHARED ADMIN SIDEBAR                                               */}
      {/* ================================================================== */}

      <AdminSidebar />

      {/* ================================================================== */}
      {/* PAGE CONTENT                                                        */}
      {/* ================================================================== */}

      <div className="lg:pl-25">
        {/* ================================================================ */}
        {/* HEADER                                                            */}
        {/* ================================================================ */}

        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  }
                }}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
                aria-label="Go back"
              >
                <FiArrowLeft />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                    Administrators
                  </h1>

                  <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 sm:inline-flex">
                    Access Control
                  </span>
                </div>

                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  Manage administrator accounts,
                  roles and access.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
                <FiSearch className="text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search administrators..."
                  className="w-52 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-[11px] font-bold text-emerald-700">
                  API Online
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadAdmins();
                }}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiRefreshCw
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                disabled={
                  filteredAdmins.length === 0
                }
                className="hidden h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
              >
                <FiDownload />

                Export
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(true)
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <FiPlus />

                <span className="hidden sm:inline">
                  Add Admin
                </span>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="border-t border-slate-100 px-4 py-3 xl:hidden">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <FiSearch className="shrink-0 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search administrators..."
                className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ================================================================ */}
        {/* MAIN                                                              */}
        {/* ================================================================ */}

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            {/* ------------------------------------------------------------ */}
            {/* PAGE INTRO                                                    */}
            {/* ------------------------------------------------------------ */}

            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  User Administration
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Admin accounts
                </h2>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Review administrator access,
                  account status and restaurant
                  assignments from one place.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={
                    !search &&
                    roleFilter === "all" &&
                    statusFilter === "all"
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiFilter />

                  Clear filters
                </button>

                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={
                    filteredAdmins.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:hidden"
                >
                  <FiDownload />

                  Export
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* API ERROR                                                     */}
            {/* ------------------------------------------------------------ */}

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="mt-0.5 shrink-0 text-red-600">
                  <FiAlertCircle />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-red-800">
                    Unable to load administrators
                  </p>

                  <p className="mt-1 wrap-break-word text-xs text-red-700">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void loadAdmins();
                  }}
                  className="shrink-0 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* KPI CARDS                                                     */}
            {/* ------------------------------------------------------------ */}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total administrators"
                value={totalCount}
                subtitle="Accounts in database"
                icon={<FiUsers />}
                tone="slate"
              />

              <StatCard
                title="Active accounts"
                value={activeCount}
                subtitle={`${totalCount > 0 ? Math.round(
                  (activeCount / totalCount) *
                    100
                ) : 0}% of administrators`}
                icon={<FiCheckCircle />}
                tone="emerald"
              />

              <StatCard
                title="Suspended"
                value={suspendedCount}
                subtitle="Currently disabled"
                icon={<FiSlash />}
                tone="amber"
              />

              <StatCard
                title="Super administrators"
                value={superAdminCount}
                subtitle="Elevated privileges"
                icon={<FiShield />}
                tone="purple"
              />
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FILTER BAR                                                     */}
            {/* ------------------------------------------------------------ */}

            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FiFilter />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Filters
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Showing{" "}
                      {filteredAdmins.length}{" "}
                      of {admins.length}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <span className="sr-only">
                      Filter by role
                    </span>

                    <select
                      value={roleFilter}
                      onChange={(event) =>
                        setRoleFilter(
                          event.target.value
                        )
                      }
                      className="h-9 min-w-44 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      <option value="all">
                        All roles
                      </option>

                      {roles.map((role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>

                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </label>

                  <label className="relative">
                    <span className="sr-only">
                      Filter by status
                    </span>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target
                            .value as FilterStatus
                        )
                      }
                      className="h-9 min-w-44 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      <option value="all">
                        All statuses
                      </option>

                      <option value="active">
                        Active
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>
                    </select>

                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </label>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* TABLE + INSPECTOR                                             */}
            {/* ------------------------------------------------------------ */}

            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
              {/* ========================================================== */}
              {/* TABLE                                                       */}
              {/* ========================================================== */}

              <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Administrator directory
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Live records from the
                      administration API
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {filteredAdmins.length}{" "}
                    records
                  </span>
                </div>

                {loading ? (
                  <div className="flex min-h-100 items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

                      <p className="text-xs font-semibold text-slate-500">
                        Loading administrators...
                      </p>
                    </div>
                  </div>
                ) : filteredAdmins.length ===
                  0 ? (
                  <EmptyState
                    search={search}
                    onClear={clearFilters}
                    onCreate={() =>
                      setShowCreateModal(
                        true
                      )
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-190 w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Administrator
                          </th>

                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Role
                          </th>

                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Restaurant
                          </th>

                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Status
                          </th>

                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Created
                          </th>

                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredAdmins.map(
                          (admin) => {
                            const isActive =
                              active(admin);

                            const isSelected =
                              selectedAdmin &&
                              String(
                                selectedAdmin.id
                              ) ===
                                String(
                                  admin.id
                                );

                            return (
                              <tr
                                key={String(
                                  admin.id
                                )}
                                onClick={() =>
                                  setSelectedAdmin(
                                    admin
                                  )
                                }
                                className={`cursor-pointer border-b border-slate-100 transition ${
                                  isSelected
                                    ? "bg-slate-50"
                                    : "hover:bg-slate-50/70"
                                }`}
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        isActive
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-200 text-slate-500"
                                      }`}
                                    >
                                      {initials(
                                        admin.name
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-xs font-bold text-slate-900">
                                          {
                                            admin.name
                                          }
                                        </p>

                                        {isSelected && (
                                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-700">
                                            Selected
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                                        <FiMail className="shrink-0" />

                                        {
                                          admin.email
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700">
                                    <FiShield />

                                    {roleLabel(
                                      admin.role
                                    )}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <p className="max-w-48 truncate text-xs font-semibold text-slate-700">
                                    {getRestaurantName(
                                      admin
                                    )}
                                  </p>

                                  {admin.restaurant_id && (
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      ID{" "}
                                      {
                                        admin.restaurant_id
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                      isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        isActive
                                          ? "bg-emerald-500"
                                          : "bg-amber-500"
                                      }`}
                                    />

                                    {isActive
                                      ? "Active"
                                      : "Suspended"}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <FiClock />

                                    {dateLabel(
                                      admin.created_at
                                    )}
                                  </div>
                                </td>

                                <td className="px-5 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      setSelectedAdmin(
                                        admin
                                      );
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    aria-label={`View ${admin.name}`}
                                  >
                                    <FiEye />
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table footer */}
                {!loading &&
                  filteredAdmins.length >
                    0 && (
                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Showing{" "}
                        <strong className="text-slate-600">
                          {
                            filteredAdmins.length
                          }
                        </strong>{" "}
                        of{" "}
                        <strong className="text-slate-600">
                          {admins.length}
                        </strong>{" "}
                        administrators
                      </span>

                      <span className="flex items-center gap-1.5">
                        <FiActivity />

                        Live database mode
                      </span>
                    </div>
                  )}
              </section>

              {/* ========================================================== */}
              {/* INSPECTOR                                                   */}
              {/* ========================================================== */}

              <aside className="min-w-0">
                <AdminInspector
                  admin={selectedAdmin}
                  saving={saving}
                  onToggleStatus={
                    toggleSelectedStatus
                  }
                />
              </aside>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* DATABASE MODE NOTE                                            */}
            {/* ------------------------------------------------------------ */}

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FiActivity />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    Live database connection
                  </p>

                  <p className="mt-0.5 wrap-break-word text-[11px] text-slate-500">
                    This page reads and writes
                    administrator records through{" "}
                    <span className="font-semibold text-slate-700">
                      {API_BASE}
                    </span>
                    .
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <span className="text-[10px] font-bold text-emerald-700">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================================================================== */}
      {/* CREATE ADMIN MODAL                                                  */}
      {/* ================================================================== */}

      {showCreateModal && (
        <Modal
          title="Add administrator"
          description="Create a new administrator account and assign its access level."
          onClose={() => {
            if (!saving) {
              setShowCreateModal(false);
            }
          }}
        >
          <form
            onSubmit={createAdmin}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                required
                icon={<FiUser />}
              >
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Sarah Jenkins"
                  className="form-input"
                  autoComplete="name"
                />
              </Field>

              <Field
                label="Email address"
                required
                icon={<FiMail />}
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target.value
                    )
                  }
                  placeholder="admin@example.com"
                  className="form-input"
                  autoComplete="email"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Role"
                required
                icon={<FiShield />}
              >
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(event) =>
                      updateForm(
                        "role",
                        event.target.value
                      )
                    }
                    className="form-input appearance-none pr-9"
                  >
                    <option value="admin">
                      Administrator
                    </option>

                    <option value="super_admin">
                      Super Administrator
                    </option>

                    <option value="manager">
                      Manager
                    </option>
                  </select>

                  <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>

              <Field
                label="Restaurant ID"
                icon={<FiActivity />}
                hint="Optional"
              >
                <input
                  value={form.restaurant_id}
                  onChange={(event) =>
                    updateForm(
                      "restaurant_id",
                      event.target.value
                    )
                  }
                  placeholder="Leave blank for global access"
                  className="form-input"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                  <FiKey />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Account password
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Use a strong password for this
                    administrator.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Password"
                  required
                  icon={<FiLock />}
                >
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      updateForm(
                        "password",
                        event.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="form-input"
                    autoComplete="new-password"
                  />
                </Field>

                <Field
                  label="Confirm password"
                  required
                  icon={<FiLock />}
                >
                  <input
                    type="password"
                    value={
                      form.password_confirmation
                    }
                    onChange={(event) =>
                      updateForm(
                        "password_confirmation",
                        event.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="form-input"
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </div>

            <InfoBox>
              Administrators can access protected
              administration features according to
              their assigned role. Make sure the
              selected role matches the person's
              responsibilities.
            </InfoBox>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(false)
                }
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="animate-spin" />

                    Creating...
                  </>
                ) : (
                  <>
                    <FiPlus />

                    Create administrator
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================== */}
      {/* TOAST                                                               */}
      {/* ================================================================== */}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-100 flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-white shadow-2xl ${
            toast.type === "error"
              ? "bg-red-600"
              : toast.type === "info"
                ? "bg-slate-800"
                : "bg-emerald-600"
          }`}
          role="status"
        >
          <span className="text-lg">
            {toast.type === "error" ? (
              <FiAlertCircle />
            ) : toast.type === "info" ? (
              <FiActivity />
            ) : (
              <FiCheckCircle />
            )}
          </span>

          <span className="text-xs font-semibold">
            {toast.message}
          </span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-white/70 transition hover:text-white"
            aria-label="Dismiss notification"
          >
            <FiX />
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* STAT CARD                                                                  */
/* ========================================================================== */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  tone:
    | "slate"
    | "emerald"
    | "amber"
    | "purple";
}) {
  const tones = {
    slate: {
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-950",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
    },
    purple: {
      icon: "bg-purple-50 text-purple-700",
      value: "text-purple-700",
    },
  };

  const selected = tones[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-bold tracking-tight ${selected.value}`}
          >
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* EMPTY STATE                                                                */
/* ========================================================================== */

function EmptyState({
  search,
  onClear,
  onCreate,
}: {
  search: string;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-100 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <FiUsers className="text-xl" />
      </div>

      <h3 className="text-sm font-bold text-slate-900">
        No administrators found
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {search
          ? "No administrator matches your current search and filter criteria."
          : "There are currently no administrator accounts available."}
      </p>

      <div className="mt-5 flex items-center gap-2">
        {search && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
        >
          <FiPlus />

          Add administrator
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* INSPECTOR                                                                  */
/* ========================================================================== */

function AdminInspector({
  admin,
  saving,
  onToggleStatus,
}: {
  admin: Admin | null;
  saving: boolean;
  onToggleStatus: () => void;
}) {
  if (!admin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-100 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiUser />
          </div>

          <p className="text-sm font-bold text-slate-800">
            Select an administrator
          </p>

          <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
            Select an administrator from the
            directory to inspect account details.
          </p>
        </div>
      </div>
    );
  }

  const isActive = active(admin);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 px-5 pb-6 pt-5 text-white">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/5" />

        <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-emerald-400/5" />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/70">
              Administrator
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                isActive
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {isActive
                ? "ACTIVE"
                : "SUSPENDED"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold ring-1 ring-white/10">
              {initials(admin.name)}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold">
                {admin.name}
              </h3>

              <p className="mt-0.5 truncate text-[11px] text-white/50">
                {admin.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-5">
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Account details
          </p>

          <div className="space-y-3">
            <InfoRow
              icon={<FiMail />}
              label="Email"
              value={admin.email}
            />

            <InfoRow
              icon={<FiShield />}
              label="Role"
              value={roleLabel(admin.role)}
            />

            <InfoRow
              icon={<FiActivity />}
              label="Restaurant"
              value={getRestaurantName(
                admin
              )}
            />

            <InfoRow
              icon={<FiClock />}
              label="Created"
              value={dateLabel(
                admin.created_at
              )}
            />

            <InfoRow
              icon={<FiClock />}
              label="Last login"
              value={dateLabel(
                admin.last_login_at ||
                  admin.last_login
              )}
            />
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Permissions
          </p>

          <div className="space-y-2">
            <PermissionRow
              label="Administration"
              enabled={isActive}
            />

            <PermissionRow
              label="User management"
              enabled={isActive}
            />

            <PermissionRow
              label="Restaurant management"
              enabled={isActive}
            />

            <PermissionRow
              label="System configuration"
              enabled={
                isActive &&
                String(
                  admin.role || ""
                )
                  .toLowerCase()
                  .replace(/[_-]+/g, " ") ===
                  "super admin"
              }
            />
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <InfoBox>
            Changing an administrator's status
            affects their ability to use protected
            administration endpoints.
          </InfoBox>
        </section>

        <button
          type="button"
          onClick={onToggleStatus}
          disabled={saving}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {saving ? (
            <>
              <FiRefreshCw className="animate-spin" />

              Updating...
            </>
          ) : isActive ? (
            <>
              <FiSlash />

              Suspend administrator
            </>
          ) : (
            <>
              <FiCheck />

              Activate administrator
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* INFO ROW                                                                   */
/* ========================================================================== */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 wrap-break-word text-xs font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PERMISSION ROW                                                             */
/* ========================================================================== */

function PermissionRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold text-slate-600">
        {label}
      </span>

      <span
        className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
          enabled
            ? "text-emerald-600"
            : "text-slate-400"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            enabled
              ? "bg-emerald-500"
              : "bg-slate-300"
          }`}
        />

        {enabled
          ? "Granted"
          : "Disabled"}
      </span>
    </div>
  );
}

/* ========================================================================== */
/* INFO BOX                                                                   */
/* ========================================================================== */

function InfoBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <FiAlertCircle className="mt-0.5 shrink-0 text-blue-500" />

      <p className="wrap-break-word text-[10px] leading-5 text-blue-700">
        {children}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* FIELD                                                                      */
/* ========================================================================== */

function Field({
  label,
  required,
  icon,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {icon && (
            <span className="text-slate-400">
              {icon}
            </span>
          )}

          {label}

          {required && (
            <span className="text-red-500">
              *
            </span>
          )}
        </span>

        {hint && (
          <span className="text-[9px] font-medium text-slate-400">
            {hint}
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/* ========================================================================== */
/* MODAL                                                                      */
/* ========================================================================== */

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 wrap-break-word text-xs text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}


