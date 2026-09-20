"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiFetch } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff" | "diner";
  phone?: string | null;
  restaurant_id?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type Restaurant = {
  id: number;
  name: string;
  description?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: unknown;
  photos?: unknown;
  is_active?: boolean;
  approved?: boolean;
};

type Analytics = {
  [key: string]: unknown;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as {
    data?: unknown;
  };

  if (value.data && typeof value.data === "object") {
    const nested = value.data as {
      data?: unknown;
    };

    if (nested.data !== undefined) {
      return nested.data as T;
    }

    return value.data as T;
  }

  return payload as T;
}

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const value = payload as {
    data?: unknown;
  };

  if (Array.isArray(value.data)) {
    return value.data as T[];
  }

  if (value.data && typeof value.data === "object") {
    const nested = value.data as {
      data?: unknown;
    };

    if (Array.isArray(nested.data)) {
      return nested.data as T[];
    }
  }

  return [];
}

function getAnalyticsNumber(
  analytics: Analytics | null,
  keys: string[],
): number | null {
  if (!analytics) {
    return null;
  }

  for (const key of keys) {
    const value = analytics[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getVenueName(
  restaurantId: number | null | undefined,
  restaurants: Restaurant[],
) {
  if (!restaurantId) {
    return "Unassigned";
  }

  return (
    restaurants.find(
      (restaurant) => restaurant.id === restaurantId,
    )?.name || `Restaurant #${restaurantId}`
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone = "primary",
}: {
  icon: string;
  label: string;
  value: string | number;
  description: string;
  tone?: "primary" | "secondary" | "tertiary";
}) {
  const iconClass =
    tone === "secondary"
      ? "bg-secondary-fixed text-secondary"
      : tone === "tertiary"
        ? "bg-tertiary-fixed text-on-tertiary-fixed"
        : "bg-primary-fixed text-primary";

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {label}
          </p>

          <p className="mt-2 font-headline-sm text-[28px] font-semibold text-primary">
            {value}
          </p>

          <p className="mt-1 font-label-sm text-[11px] text-on-surface-variant">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-14 shrink-0 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
        enabled
          ? "bg-primary"
          : "bg-surface-container-highest"
      } ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-on-primary shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-7" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(
    null,
  );

  const [restaurants, setRestaurants] = useState<Restaurant[]>(
    [],
  );

  const [users, setUsers] = useState<User[]>([]);

  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [loading, setLoading] = useState(true);

  const [apiConnected, setApiConnected] = useState(false);

  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);

  const [fastingEnabled, setFastingEnabled] = useState(true);

  const [maintenanceMode, setMaintenanceMode] =
    useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] =
    useState(false);

  const [pinRotationEnabled, setPinRotationEnabled] =
    useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const cachedUser = getUser() as User | null;

      if (
        !cachedUser ||
        cachedUser.role !== "admin"
      ) {
        router.replace("/login");
        return;
      }

      let authenticatedUser = cachedUser;

      try {
        const meResponse = await apiFetch("/auth/me");

        const me =
          unwrapData<User>(meResponse);

        if (me) {
          authenticatedUser = me;
          localStorage.setItem(
            "user",
            JSON.stringify(me),
          );
        }
      } catch (error) {
        console.error(
          "Unable to refresh admin session:",
          error,
        );
      }

      if (authenticatedUser.role !== "admin") {
        router.replace("/login");
        return;
      }

      setCurrentUser(authenticatedUser);

      const [
        restaurantsResponse,
        usersResponse,
        analyticsResponse,
      ] = await Promise.all([
        apiFetch("/admin/restaurants"),
        apiFetch("/admin/users"),
        apiFetch("/admin/analytics").catch(
          () => null,
        ),
      ]);

      setRestaurants(
        unwrapArray<Restaurant>(
          restaurantsResponse,
        ),
      );

      setUsers(
        unwrapArray<User>(usersResponse),
      );

      if (analyticsResponse) {
        setAnalytics(
          unwrapData<Analytics>(
            analyticsResponse,
          ),
        );
      }

      setApiConnected(true);
    } catch (error) {
      console.error(
        "Unable to load system settings data:",
        error,
      );

      setApiConnected(false);

      setMessage(
        "Unable to connect to the Laravel API.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const restaurantCount = restaurants.length;

  const pendingRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.approved === false,
  ).length;

  const activeRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.is_active !== false &&
      restaurant.approved !== false,
  ).length;

  const adminCount = users.filter(
    (user) => user.role === "admin",
  ).length;

  const staffCount = users.filter(
    (user) => user.role === "staff",
  ).length;

  const activeStaffCount = users.filter(
    (user) =>
      user.role === "staff" &&
      user.is_active !== false,
  ).length;

  const suspendedUsers = users.filter(
    (user) => user.is_active === false,
  ).length;

  const dinerCount = users.filter(
    (user) => user.role === "diner",
  ).length;

  const assignedStaffCount = users.filter(
    (user) =>
      user.role === "staff" &&
      Boolean(user.restaurant_id),
  ).length;

  const todayReservations =
    getAnalyticsNumber(analytics, [
      "reservations_today",
      "today_reservations",
      "reservationsToday",
      "todayReservations",
    ]);

  const lastUpdated = useMemo(() => {
    const values = users
      .map((user) => user.updated_at)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter(
        (date) => !Number.isNaN(date.getTime()),
      )
      .sort(
        (a, b) => b.getTime() - a.getTime(),
      );

    return values[0];
  }, [users]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    /*
     * IMPORTANT:
     * The current Laravel backend does not expose a
     * system-settings update endpoint.
     *
     * We therefore intentionally do NOT send fake
     * requests or pretend that these settings were
     * persisted.
     */
    await new Promise((resolve) =>
      setTimeout(resolve, 500),
    );

    setSaving(false);

    setMessage(
      "The current Laravel API does not expose a system-settings persistence endpoint yet. No configuration was falsely marked as saved.",
    );
  };

  const handleDiscard = () => {
    setFastingEnabled(true);
    setMaintenanceMode(false);
    setTwoFactorEnabled(false);
    setPinRotationEnabled(false);

    setMessage(
      "Local configuration changes were reset.",
    );
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            sync
          </span>

          <p className="font-body-md text-on-surface-variant">
            Loading platform configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      <AdminSidebar />

      <div className="pl-50 max-lg:pl-0">
        <header className="fixed left-75 right-0 top-0 z-40 h-20 bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl max-lg:left-0 max-lg:top-16">
          <div className="flex h-20 w-full items-center justify-between gap-6 px-container-padding-desktop max-lg:px-5">
            <div className="flex max-w-xl flex-1 items-center gap-4">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                  search
                </span>

                <input
                  className="w-full rounded-xl bg-surface-container-lowest py-2.5 pl-11 pr-4 font-body-md text-on-surface outline-none placeholder:text-outline focus:ring-2 focus:ring-primary shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                  placeholder="Search restaurants, reservations, customers, phone, or ID..."
                  type="text"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-1.5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] xl:flex">
                <span className="h-2 w-2 rounded-full bg-primary" />

                <span className="font-label-sm text-[12px] font-medium text-on-surface-variant">
                  Network:{" "}
                  <strong className="font-semibold text-on-surface">
                    {restaurantCount} Venues
                  </strong>{" "}
                  (Addis Ababa)
                </span>
              </div>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 font-label-sm text-[12px] text-on-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  calendar_today
                </span>

                <span>
                  Today,{" "}
                  {formatDate(new Date())}
                </span>
              </button>

              <button
                type="button"
                onClick={loadData}
                className="rounded-xl bg-surface-container-lowest p-2.5 text-on-surface-variant shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors hover:bg-surface-container hover:text-on-surface"
                title="Refresh Telemetry"
              >
                <span className="material-symbols-outlined text-[20px]">
                  sync
                </span>
              </button>

              <button
                type="button"
                className="relative rounded-xl bg-surface-container-lowest p-2.5 text-on-surface-variant shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors hover:bg-surface-container hover:text-on-surface"
                title="Admin Notifications"
              >
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>

                {pendingRestaurants > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary" />
                )}
              </button>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <span className="material-symbols-outlined text-[18px] text-on-primary">
                  person
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-screen w-full bg-surface px-container-padding-desktop pt-20 max-lg:px-5 max-lg:pt-36">
          <div className="flex w-full flex-col pb-16">
            {/* Top Settings Title & Control Bar */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-surface-container pb-8 md:flex-row md:items-center">
              <div className="flex max-w-3xl flex-col gap-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-label-sm text-[12px] font-semibold uppercase tracking-wider text-secondary">
                    Global Orchestration
                  </span>

                  <span className="inline-block h-1 w-1 rounded-full bg-outline-variant" />

                  <span className="font-label-sm text-[12px] font-medium text-on-surface-variant">
                    Core Registry v2.4.2
                  </span>
                </div>

                <h1 className="font-headline-md text-[32px] font-semibold tracking-tight text-primary">
                  System Settings
                </h1>

                <p className="font-body-md leading-relaxed text-on-surface-variant">
                  Configure platform defaults, reservation
                  guardrails, payment escrows, and
                  infrastructure APIs across all{" "}
                  <strong className="text-on-surface">
                    {restaurantCount}
                  </strong>{" "}
                  licensed venues.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 self-start md:self-center">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="rounded-xl px-5 py-2.5 font-label-md text-[14px] font-semibold text-on-surface-variant shadow-sm transition-all hover:bg-surface-container-high hover:text-on-surface"
                >
                  Discard Changes
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-label-md text-[14px] font-semibold text-on-primary shadow-md transition-all hover:bg-primary-container active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {saving ? "sync" : "verified"}
                  </span>

                  <span>
                    {saving
                      ? "Checking Configuration..."
                      : "Save All Configurations"}
                  </span>
                </button>
              </div>
            </div>

            {message && (
              <div className="mb-8 flex items-start gap-3 rounded-xl bg-surface-container-high p-4">
                <span className="material-symbols-outlined text-secondary">
                  info
                </span>

                <p className="font-body-md text-[14px] text-on-surface-variant">
                  {message}
                </p>
              </div>
            )}

            {/* Main Multi-column Architecture */}
            <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
              {/* Left Category Navigation Rail */}
              <aside className="space-y-3 xl:sticky xl:top-24 xl:col-span-3">
                <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Configuration Rails
                    </span>

                    <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-[11px] font-semibold text-on-primary-fixed">
                      8 Nodes
                    </span>
                  </div>

                  <nav className="mt-2 space-y-1">
                    {[
                      ["#sec-localization", "public", "Localization & Identity"],
                      ["#sec-guardrails", "table_restaurant", "Reservation & Escrow"],
                      ["#sec-payments", "account_balance_wallet", "Payment Gateways"],
                      ["#sec-security", "lock", "Security & Terminal Access"],
                      ["#sec-infrastructure", "dns", "Infrastructure & State"],
                      ["#sec-notifications", "campaign", "SMS & Push Relays"],
                      ["#sec-roles", "badge", "Role Permissions (RBAC)"],
                      ["#sec-audit", "history", "Immutable Ledger"],
                    ].map(([href, icon, label], index) => (
                      <a
                        key={href}
                        href={href}
                        className={
                          index === 0
                            ? "group flex items-center justify-between rounded-xl bg-primary px-3.5 py-2.5 font-label-md text-[14px] font-semibold text-on-primary shadow-sm transition-all"
                            : "group flex items-center justify-between rounded-xl px-3.5 py-2.5 font-label-md text-[14px] text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              index === 0
                                ? "text-on-primary"
                                : "text-on-surface-variant group-hover:text-primary"
                            }`}
                          >
                            {icon}
                          </span>

                          <span>{label}</span>
                        </div>

                        {index === 0 ? (
                          <span className="material-symbols-outlined text-[16px] text-on-primary opacity-80">
                            chevron_right
                          </span>
                        ) : null}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="space-y-4 rounded-2xl bg-surface-container-low p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Metropolitan Node
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-[11px] font-semibold text-on-primary-fixed">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          apiConnected
                            ? "animate-pulse bg-primary"
                            : "bg-secondary"
                        }`}
                      />

                      {apiConnected
                        ? "EAT Live"
                        : "API Offline"}
                    </span>
                  </div>

                  <p className="font-body-md leading-snug text-on-surface-variant">
                    Connected to the DINEET Laravel
                    API and PostgreSQL application
                    environment.
                  </p>

                  <div className="flex items-center justify-between pt-2 font-label-sm text-[12px]">
                    <span className="text-on-surface-variant">
                      API Status
                    </span>

                    <span className="font-mono font-semibold text-primary">
                      {apiConnected
                        ? "CONNECTED"
                        : "OFFLINE"}
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className={`h-full rounded-full ${
                        apiConnected
                          ? "w-full bg-primary"
                          : "w-1/4 bg-secondary"
                      }`}
                    />
                  </div>
                </div>
              </aside>

              {/* Right Settings Working Surface */}
              <div className="space-y-10 xl:col-span-9">
                {/* SECTION 1 */}
                <section
                  className="scroll-mt-24 space-y-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-localization"
                >
                  <div className="flex items-start justify-between border-b border-surface-container pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                          <span className="material-symbols-outlined text-[20px]">
                            public
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          Platform Identity & Regional
                          Localization
                        </h2>
                      </div>

                      <p className="font-body-md text-on-surface-variant">
                        High-level platform metadata and
                        regional application defaults.
                      </p>
                    </div>

                    <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-[12px] font-semibold text-on-surface">
                      Zone ETH-01
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Platform Internal Identifier
                      </label>

                      <input
                        className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                        type="text"
                        defaultValue="DINEET Platform Admin OS"
                      />

                      <span className="font-label-sm text-[11px] text-outline">
                        Frontend platform identifier.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Consumer Front Title
                      </label>

                      <input
                        className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                        type="text"
                        defaultValue="DINEET | Discover. Reserve. Dine."
                      />

                      <span className="font-label-sm text-[11px] text-outline">
                        Current frontend product title.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Regional Host Cluster
                      </label>

                      <div className="relative">
                        <input
                          className="w-full cursor-not-allowed rounded-xl bg-surface-container-high px-4 py-3 font-body-md text-on-surface"
                          readOnly
                          type="text"
                          value="Addis Ababa Metropolitan Node"
                        />

                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-primary">
                          verified
                        </span>
                      </div>

                      <span className="font-label-sm text-[11px] text-outline">
                        Current deployment location.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Base Operating Currency
                      </label>

                      <select
                        className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                        defaultValue="ETB"
                      >
                        <option value="ETB">
                          ETB (Ethiopian Birr - ብር)
                        </option>
                      </select>

                      <span className="font-label-sm text-[11px] text-outline">
                        Currency configuration is not
                        persisted by the current API.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Official Master Clock / Timezone
                      </label>

                      <input
                        className="w-full rounded-xl bg-surface-container-high px-4 py-3 font-body-md text-on-surface"
                        readOnly
                        type="text"
                        value="Africa/Addis_Ababa (EAT, UTC+3)"
                      />

                      <span className="font-label-sm text-[11px] text-outline">
                        Application timezone default.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Active Regional Languages
                      </label>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          "አማርኛ (Amharic)",
                          "English (UK / US)",
                          "Afaan Oromoo",
                        ].map((language) => (
                          <span
                            key={language}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-1.5 font-label-sm text-[12px] font-semibold text-on-primary-fixed"
                          >
                            <span>{language}</span>

                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>
                          </span>
                        ))}
                      </div>

                      <span className="font-label-sm text-[11px] text-outline">
                        Frontend-supported language labels.
                      </span>
                    </div>
                  </div>
                </section>

                {/* SECTION 2 */}
                <section
                  className="scroll-mt-24 space-y-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-guardrails"
                >
                  <div className="flex items-start justify-between border-b border-surface-container pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
                          <span className="material-symbols-outlined text-[20px]">
                            room_service
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          Platform Reservation & Escrow
                          Guardrails
                        </h2>
                      </div>

                      <p className="font-body-md text-on-surface-variant">
                        Reservation policies currently
                        exposed by the backend.
                      </p>
                    </div>

                    <span className="rounded-full bg-secondary-container px-3 py-1 font-label-sm text-[12px] font-semibold text-on-secondary-container">
                      Backend Status
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-3 rounded-xl bg-surface-container-low p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          Standard Turnaround
                        </span>

                        <span className="material-symbols-outlined text-[20px] text-primary">
                          schedule
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="font-headline-sm text-[24px] font-semibold text-primary">
                          Not configured
                        </div>

                        <p className="font-label-sm text-[12px] text-on-surface-variant">
                          No reservation turnaround
                          setting is currently exposed
                          through the Laravel API.
                        </p>
                      </div>

                      <div className="pt-2">
                        <input
                          className="w-full cursor-not-allowed accent-primary opacity-50"
                          disabled
                          max="150"
                          min="45"
                          step="15"
                          type="range"
                          value="75"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl bg-surface-container-low p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          Deposit Escrow
                        </span>

                        <span className="material-symbols-outlined text-[20px] text-secondary">
                          payments
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="font-headline-sm text-[24px] font-semibold text-primary">
                          Not configured
                        </div>

                        <p className="font-label-sm text-[12px] text-on-surface-variant">
                          Payment/deposit policy is not
                          available from the current
                          backend.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <span className="rounded bg-surface px-2 py-1 font-label-sm text-[11px] font-semibold text-on-surface">
                          API
                        </span>

                        <span className="rounded bg-secondary px-2 py-1 font-label-sm text-[11px] font-semibold text-on-secondary">
                          Not configured
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl bg-surface-container-low p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          No-Show Grace
                        </span>

                        <span className="material-symbols-outlined text-[20px] text-tertiary">
                          timer
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="font-headline-sm text-[24px] font-semibold text-primary">
                          Not configured
                        </div>

                        <p className="font-label-sm text-[12px] text-on-surface-variant">
                          No automated no-show grace
                          policy is exposed by the API.
                        </p>
                      </div>

                      <div className="pt-2">
                        <span className="font-label-sm font-mono text-[11px] text-outline">
                          Backend policy unavailable
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Maximum Direct App Party Size
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          className="w-32 rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                          type="number"
                          defaultValue={12}
                        />

                        <p className="font-label-sm leading-tight text-[12px] text-on-surface-variant">
                          Reservation validation is
                          currently handled by the
                          reservation request and table
                          capacity.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Advance Booking Horizon
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          className="w-32 rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                          type="number"
                          defaultValue={30}
                        />

                        <p className="font-label-sm leading-tight text-[12px] text-on-surface-variant">
                          Current backend does not expose
                          a configurable rolling horizon.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-container-low p-6 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-[24px]">
                          calendar_month
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline-sm text-[18px] font-semibold text-primary">
                            Automated Orthodox Fasting
                            Calendar Synchronization
                          </h4>

                          <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-[11px] font-bold text-on-primary-fixed">
                            APPLICATION POLICY
                          </span>
                        </div>

                        <p className="max-w-2xl font-body-md text-on-surface-variant">
                          This feature is currently a
                          frontend policy control only.
                          No corresponding Laravel
                          configuration endpoint exists.
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 self-end md:self-center">
                      <span className="font-label-sm text-[12px] font-semibold text-primary">
                        {fastingEnabled
                          ? "ENABLED"
                          : "DISABLED"}
                      </span>

                      <Toggle
                        enabled={fastingEnabled}
                        onChange={() =>
                          setFastingEnabled(
                            (value) => !value,
                          )
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* SECTION 3 */}
                <section
                  className="scroll-mt-24 space-y-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-payments"
                >
                  <div className="flex items-start justify-between border-b border-surface-container pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
                          <span className="material-symbols-outlined text-[20px]">
                            currency_exchange
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          National Payment Gateways &
                          Escrow Banking
                        </h2>
                      </div>

                      <p className="font-body-md text-on-surface-variant">
                        Current backend payment integration
                        status.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-[12px] font-semibold text-on-primary-fixed">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          apiConnected
                            ? "bg-primary"
                            : "bg-secondary"
                        }`}
                      />

                      <span>
                        {apiConnected
                          ? "API Connected"
                          : "API Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="flex flex-col justify-between space-y-6 rounded-2xl bg-surface-container-low p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-lowest text-[16px] font-bold text-secondary shadow-sm">
                              PAY
                            </div>

                            <div>
                              <h3 className="font-label-md text-[14px] font-semibold text-on-surface">
                                Payment Gateway
                              </h3>

                              <span className="font-label-sm text-[11px] text-on-surface-variant">
                                Current Laravel payment
                                configuration
                              </span>
                            </div>
                          </div>

                          <span className="rounded-full bg-secondary-fixed px-2.5 py-1 font-label-sm text-[11px] font-semibold text-on-secondary-fixed">
                            Not configured
                          </span>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="block font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                              Merchant Identifier
                            </label>

                            <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-3.5 py-2.5">
                              <span className="font-mono text-[13px] font-medium text-on-surface">
                                Not available
                              </span>

                              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                                lock
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                              Webhook Receiver
                            </label>

                            <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-3.5 py-2.5">
                              <span className="truncate font-mono text-[12px] text-on-surface">
                                Not exposed by current API
                              </span>

                              <span className="material-symbols-outlined ml-2 shrink-0 text-[18px] text-on-surface-variant">
                                lock
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3.5 font-label-sm text-[12px]">
                        <span className="text-on-surface-variant">
                          Payment State
                        </span>

                        <span className="font-semibold text-secondary">
                          Backend configuration required
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between space-y-6 rounded-2xl bg-surface-container-low p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-lowest text-[16px] font-bold text-primary shadow-sm">
                              CBE
                            </div>

                            <div>
                              <h3 className="font-label-md text-[14px] font-semibold text-on-surface">
                                Bank Settlement
                              </h3>

                              <span className="font-label-sm text-[11px] text-on-surface-variant">
                                Banking integration status
                              </span>
                            </div>
                          </div>

                          <span className="rounded-full bg-secondary-fixed px-2.5 py-1 font-label-sm text-[11px] font-semibold text-on-secondary-fixed">
                            Not configured
                          </span>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="block font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                              Settlement Account
                            </label>

                            <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-3.5 py-2.5">
                              <span className="font-mono text-[13px] font-medium text-on-surface">
                                Not available
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                              Settlement Split
                            </label>

                            <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-3.5 py-2.5">
                              <span className="font-body-md text-[14px] font-medium text-on-surface">
                                Not configured
                              </span>

                              <span className="rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-secondary">
                                API required
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3.5 font-label-sm text-[12px]">
                        <span className="text-on-surface-variant">
                          Automated Reconciliation
                        </span>

                        <span className="font-semibold text-secondary">
                          Not configured
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-xl bg-surface-container-high p-4">
                    <span className="material-symbols-outlined text-[24px] text-secondary">
                      verified_user
                    </span>

                    <p className="font-body-md text-on-surface-variant">
                      Payment credentials and settlement
                      accounts are intentionally not displayed
                      unless the Laravel API exposes them.
                      Secrets should never be hardcoded into
                      this frontend.
                    </p>
                  </div>
                </section>

                {/* SECTION 4 */}
                <section
                  className="scroll-mt-24 space-y-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-security"
                >
                  <div className="flex items-start justify-between border-b border-surface-container pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                          <span className="material-symbols-outlined text-[20px]">
                            shield
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          Security, Access & Terminal
                          Governance
                        </h2>
                      </div>

                      <p className="font-body-md text-on-surface-variant">
                        Security information currently
                        supported by the authentication API.
                      </p>
                    </div>

                    <span className="rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-[12px] font-semibold text-on-primary-fixed">
                      JWT Authentication
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="flex items-start justify-between gap-4 rounded-xl bg-surface-container-low p-5">
                        <div className="space-y-1">
                          <h4 className="font-label-md text-[14px] font-semibold text-on-surface">
                            Two-Factor Authentication
                          </h4>

                          <p className="font-body-md text-[14px] text-on-surface-variant">
                            No 2FA configuration endpoint
                            exists in the current Laravel
                            backend.
                          </p>
                        </div>

                        <Toggle
                          enabled={twoFactorEnabled}
                          onChange={() =>
                            setTwoFactorEnabled(
                              (value) => !value,
                            )
                          }
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-xl bg-surface-container-low p-5">
                        <div className="space-y-1">
                          <h4 className="font-label-md text-[14px] font-semibold text-on-surface">
                            Host PIN Rotation
                          </h4>

                          <p className="font-body-md text-[14px] text-on-surface-variant">
                            Host PIN rotation is not
                            represented in the current
                            database or API.
                          </p>
                        </div>

                        <Toggle
                          enabled={pinRotationEnabled}
                          onChange={() =>
                            setPinRotationEnabled(
                              (value) => !value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          Password Complexity
                        </label>

                        <select
                          className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                          defaultValue="backend"
                        >
                          <option value="backend">
                            Laravel Backend Policy
                          </option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          JWT Session
                        </label>

                        <select
                          className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                          defaultValue="jwt"
                        >
                          <option value="jwt">
                            JWT Authentication
                          </option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          Failed Auth Lockout
                        </label>

                        <select
                          className="w-full rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                          defaultValue="backend"
                        >
                          <option value="backend">
                            Backend Policy
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl bg-surface-container-low p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-primary">
                            group
                          </span>

                          <span className="font-label-md text-[14px] font-semibold text-on-surface">
                            Registered Platform Users
                          </span>
                        </div>

                        <span className="font-label-sm text-[12px] font-semibold text-secondary">
                          {users.length} records
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div>
                            <p className="font-label-md text-[14px] font-semibold text-on-surface">
                              Administrators
                            </p>

                            <p className="font-label-sm text-[11px] text-outline">
                              Platform role
                            </p>
                          </div>

                          <span className="font-headline-sm text-[22px] font-semibold text-primary">
                            {adminCount}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div>
                            <p className="font-label-md text-[14px] font-semibold text-on-surface">
                              Restaurant Staff
                            </p>

                            <p className="font-label-sm text-[11px] text-outline">
                              Staff role
                            </p>
                          </div>

                          <span className="font-headline-sm text-[22px] font-semibold text-primary">
                            {staffCount}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div>
                            <p className="font-label-md text-[14px] font-semibold text-on-surface">
                              Assigned Staff
                            </p>

                            <p className="font-label-sm text-[11px] text-outline">
                              Restaurant linked
                            </p>
                          </div>

                          <span className="font-headline-sm text-[22px] font-semibold text-primary">
                            {assignedStaffCount}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div>
                            <p className="font-label-md text-[14px] font-semibold text-on-surface">
                              Active Staff
                            </p>

                            <p className="font-label-sm text-[11px] text-outline">
                              Account active
                            </p>
                          </div>

                          <span className="font-headline-sm text-[22px] font-semibold text-primary">
                            {activeStaffCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 5 */}
                <section
                  className="scroll-mt-24 space-y-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-infrastructure"
                >
                  <div className="flex items-start justify-between border-b border-surface-container pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
                          <span className="material-symbols-outlined text-[20px]">
                            dns
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          System Infrastructure &
                          Telemetry Status
                        </h2>
                      </div>

                      <p className="font-body-md text-on-surface-variant">
                        Live application information available
                        from the current Laravel API.
                      </p>
                    </div>

                    <span className="rounded-full bg-surface-container px-3 py-1 font-mono font-label-sm text-[12px] font-semibold text-on-surface">
                      API
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                        API Status
                      </span>

                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-[24px] font-semibold text-primary">
                          {apiConnected
                            ? "Online"
                            : "Offline"}
                        </span>

                        <span className="font-label-sm text-[11px] font-semibold text-primary">
                          Laravel
                        </span>
                      </div>

                      <p className="font-label-sm text-[11px] text-outline">
                        API authentication endpoint
                      </p>
                    </div>

                    <div className="space-y-2 rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                        Restaurants
                      </span>

                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-[24px] font-semibold text-primary">
                          {restaurantCount}
                        </span>

                        <span className="font-label-sm text-[11px] font-semibold text-primary">
                          Venues
                        </span>
                      </div>

                      <p className="font-label-sm text-[11px] text-outline">
                        Loaded from admin restaurant API
                      </p>
                    </div>

                    <div className="space-y-2 rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                        Active Accounts
                      </span>

                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-[24px] font-semibold text-on-surface">
                          {
                            users.filter(
                              (user) =>
                                user.is_active !== false,
                            ).length
                          }
                        </span>

                        <span className="font-label-sm text-[11px] text-on-surface-variant">
                          Users
                        </span>
                      </div>

                      <p className="font-label-sm text-[11px] text-outline">
                        Current user records
                      </p>
                    </div>

                    <div className="space-y-2 rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-[11px] font-semibold uppercase text-on-surface-variant">
                        Suspended Accounts
                      </span>

                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-[24px] font-semibold text-secondary">
                          {suspendedUsers}
                        </span>

                        <span className="font-label-sm text-[11px] font-semibold text-secondary">
                          Users
                        </span>
                      </div>

                      <p className="font-label-sm text-[11px] text-outline">
                        is_active = false
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-container-low p-6 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface">
                        <span className="material-symbols-outlined text-[24px]">
                          construction
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-headline-sm text-[18px] font-semibold text-on-surface">
                          Emergency Platform Maintenance
                          Mode
                        </h4>

                        <p className="max-w-2xl font-body-md text-on-surface-variant">
                          The current Laravel API does not
                          expose a maintenance-mode endpoint.
                          This control therefore remains a
                          local UI state and is not presented
                          as persisted platform configuration.
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 self-end md:self-center">
                      <span className="font-label-sm text-[12px] font-semibold text-on-surface-variant">
                        {maintenanceMode
                          ? "LOCAL ON"
                          : "OFFLINE / STANDBY"}
                      </span>

                      <Toggle
                        enabled={maintenanceMode}
                        onChange={() =>
                          setMaintenanceMode(
                            (value) => !value,
                          )
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* RBAC */}
                <section
                  className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-roles"
                >
                  <div className="mb-6 flex items-start justify-between border-b border-surface-container pb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                          <span className="material-symbols-outlined text-[20px]">
                            badge
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          Role Permissions (RBAC)
                        </h2>
                      </div>

                      <p className="mt-2 font-body-md text-on-surface-variant">
                        Roles currently represented by the
                        Laravel application.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] border-collapse">
                      <thead>
                        <tr className="border-b border-surface-container">
                          <th className="px-4 py-3 text-left font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                            Role
                          </th>

                          <th className="px-4 py-3 text-left font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                            Users
                          </th>

                          <th className="px-4 py-3 text-left font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                            Restaurant Access
                          </th>

                          <th className="px-4 py-3 text-left font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-b border-surface-container">
                          <td className="px-4 py-4 font-label-md text-[14px] font-semibold text-on-surface">
                            Administrator
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            {adminCount}
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            Platform-wide
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-[11px] font-semibold text-on-primary-fixed">
                              Active
                            </span>
                          </td>
                        </tr>

                        <tr className="border-b border-surface-container">
                          <td className="px-4 py-4 font-label-md text-[14px] font-semibold text-on-surface">
                            Restaurant Staff
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            {staffCount}
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            Assigned restaurant
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-[11px] font-semibold text-on-primary-fixed">
                              Active
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td className="px-4 py-4 font-label-md text-[14px] font-semibold text-on-surface">
                            Diner
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            {dinerCount}
                          </td>

                          <td className="px-4 py-4 text-on-surface-variant">
                            Reservation access
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-[11px] font-semibold text-on-surface">
                              Consumer
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* AUDIT */}
                <section
                  className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-8 shadow-sm"
                  id="sec-audit"
                >
                  <div className="mb-6 flex items-start justify-between border-b border-surface-container pb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                          <span className="material-symbols-outlined text-[20px]">
                            history
                          </span>
                        </div>

                        <h2 className="font-headline-sm text-[24px] font-semibold text-primary">
                          Immutable Ledger
                        </h2>
                      </div>

                      <p className="mt-2 font-body-md text-on-surface-variant">
                        Current application records available
                        for audit context.
                      </p>
                    </div>

                    <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-[11px] font-semibold text-on-surface">
                      API Records
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-surface-container-low p-5">
                      <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                        User Records
                      </span>

                      <p className="mt-2 font-headline-sm text-[24px] font-semibold text-primary">
                        {users.length}
                      </p>

                      <p className="mt-1 font-label-sm text-[11px] text-outline">
                        Loaded from /admin/users
                      </p>
                    </div>

                    <div className="rounded-xl bg-surface-container-low p-5">
                      <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                        Restaurant Records
                      </span>

                      <p className="mt-2 font-headline-sm text-[24px] font-semibold text-primary">
                        {restaurants.length}
                      </p>

                      <p className="mt-1 font-label-sm text-[11px] text-outline">
                        Loaded from /admin/restaurants
                      </p>
                    </div>

                    <div className="rounded-xl bg-surface-container-low p-5">
                      <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                        Latest User Update
                      </span>

                      <p className="mt-2 font-headline-sm text-[18px] font-semibold text-primary">
                        {lastUpdated
                          ? formatDateTime(
                              lastUpdated.toISOString(),
                            )
                          : "Not available"}
                      </p>

                      <p className="mt-1 font-label-sm text-[11px] text-outline">
                        Based on users.updated_at
                      </p>
                    </div>
                  </div>

                  {todayReservations !== null && (
                    <div className="mt-6 rounded-xl bg-surface-container-high p-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">
                          book_online
                        </span>

                        <p className="font-body-md text-on-surface-variant">
                          The backend analytics endpoint
                          reports{" "}
                          <strong className="text-on-surface">
                            {todayReservations}
                          </strong>{" "}
                          reservations for today.
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Persistent Sticky Save Anchor */}
                <div className="sticky bottom-6 z-30 flex flex-col items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest/95 p-4 shadow-xl backdrop-blur-md sm:flex-row">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 shrink-0 animate-pulse rounded-full ${
                        apiConnected
                          ? "bg-primary"
                          : "bg-secondary"
                      }`}
                    />

                    <div>
                      <p className="font-label-md text-[14px] font-semibold text-on-surface">
                        {apiConnected
                          ? "Application API connected"
                          : "Application API disconnected"}
                      </p>

                      <p className="font-label-sm text-[11px] text-on-surface-variant">
                        {currentUser?.name
                          ? `Authenticated as ${currentUser.name}.`
                          : "Authentication state unavailable."}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                    <button
                      type="button"
                      onClick={handleDiscard}
                      className="rounded-xl px-5 py-2.5 font-label-md text-[14px] font-semibold text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                    >
                      Reset to Defaults
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSave}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-label-md text-[14px] font-semibold text-on-primary shadow-md transition-all hover:bg-primary-container active:scale-[0.99] disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        save
                      </span>

                      <span>
                        {saving
                          ? "Checking..."
                          : "Save All Configurations"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Keep logout available for keyboard/mobile users without changing desktop UI */}
      <button
        type="button"
        className="sr-only"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}