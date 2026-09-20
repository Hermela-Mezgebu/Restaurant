"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

/* =========================================================
   Types
========================================================= */

type NotificationCategory =
  | "restaurants"
  | "security"
  | "escrow"
  | "approvals"
  | "system";

type NotificationStatus = "read" | "unread";

type Notification = {
  id: string;

  title: string;
  description?: string | null;

  category: NotificationCategory | string;
  categories?: NotificationCategory[];

  type?: string | null;
  status: NotificationStatus;

  createdAt: string;

  node?: string | null;
  source?: string | null;

  priority?: "low" | "medium" | "high" | "critical" | null;

  restaurantId?: string | null;
  restaurantName?: string | null;

  imageUrl?: string | null;

  metadata?: {
    licenseNumber?: string | null;
    amount?: number | null;
    currency?: string | null;
    venueCount?: number | null;
    phone?: string | null;
    batchId?: string | null;
    [key: string]: unknown;
  };
};

type NotificationStats = {
  unread: number;
  total: number;

  restaurants: number;
  security: number;
  escrow: number;
  approvals: number;
  system: number;

  regulatoryQueue?: number;
  settlementAmount?: number;
  settlementCurrency?: string;
  uptime?: number;
  endpointsGreen?: number;
  totalEndpoints?: number;
};

type NotificationSettings = {
  cancellationSpike: boolean;
  merchantOnboarding: boolean;
  settlementDispatches: boolean;
  latencyAlerts: boolean;
};

type ChannelStatus = {
  name: string;
  description?: string;
  status: "operational" | "active" | "synced" | "degraded" | "offline";
  deliveryRate?: number;
  icon?: string;
};

type SystemHealth = {
  uptime: number;
  endpointsGreen: number;
  totalEndpoints: number;
  channels: ChannelStatus[];

  webhookLatency?: {
    average: number;
    unit: string;
    points: number[];
  };
};

type LedgerVenue = {
  name: string;
  amount: number;
  currency: string;
};

type SettlementLedger = {
  id: string;
  batchId: string;
  institution: string;
  total: number;
  currency: string;
  venues: LedgerVenue[];
};

/* =========================================================
   API configuration
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

/*
  Change these paths if your backend uses different routes.

  Example:
  NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
*/
const API_ENDPOINTS = {
  notifications: "/admin/notifications",
  markAllRead: "/admin/notifications/read-all",
  clearRead: "/admin/notifications/read",
  settings: "/admin/notifications/settings",
  systemHealth: "/admin/system/health",
  ledger: (id: string) => `/admin/settlements/${id}/ledger`,
  dismiss: (id: string) => `/admin/notifications/${id}/dismiss`,
};

/* =========================================================
   Helpers
========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const error = await response.json();

      if (error?.message) {
        message = error.message;
      }
    } catch {
      // Ignore JSON parsing failure.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${Math.max(seconds, 1)} secs ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "min" : "mins"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
}

function formatMoney(amount = 0, currency = "ETB") {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

function getNotificationCategories(
  notification: Notification,
): NotificationCategory[] {
  if (notification.categories?.length) {
    return notification.categories;
  }

  return [notification.category as NotificationCategory];
}

function getNotificationAccent(notification: Notification) {
  const categories = getNotificationCategories(notification);

  if (categories.includes("security")) {
    return {
      border: "bg-primary-fixed-dim",
      iconBg: "bg-surface-container-high",
      iconColor: "text-primary",
    };
  }

  if (categories.includes("escrow")) {
    return {
      border: "bg-primary",
      iconBg: "bg-primary-fixed",
      iconColor: "text-on-primary-fixed",
    };
  }

  if (categories.includes("approvals")) {
    return {
      border: "bg-secondary",
      iconBg: "bg-secondary-fixed",
      iconColor: "text-on-secondary-fixed",
    };
  }

  if (notification.priority === "critical") {
    return {
      border: "bg-error",
      iconBg: "bg-error-container",
      iconColor: "text-on-error-container",
    };
  }

  return {
    border: "bg-tertiary",
    iconBg: "bg-tertiary-fixed",
    iconColor: "text-on-tertiary-fixed",
  };
}

function getNotificationIcon(notification: Notification) {
  const type = notification.type?.toLowerCase();

  if (type?.includes("settlement")) return "payments";
  if (type?.includes("security")) return "admin_panel_settings";
  if (type?.includes("access")) return "admin_panel_settings";
  if (type?.includes("approval")) return "verified_user";
  if (type?.includes("onboard")) return "storefront";
  if (type?.includes("cancel")) return "warning";
  if (type?.includes("webhook")) return "sync_alt";
  if (type?.includes("system")) return "settings";

  const categories = getNotificationCategories(notification);

  if (categories.includes("security")) return "admin_panel_settings";
  if (categories.includes("escrow")) return "payments";
  if (categories.includes("approvals")) return "verified_user";
  if (categories.includes("restaurants")) return "storefront";
  if (categories.includes("system")) return "sync_alt";

  return "notifications";
}

function getCategoryLabel(category: string) {
  switch (category) {
    case "restaurants":
      return "Restaurants";
    case "security":
      return "Users & Security";
    case "escrow":
      return "Reservations & Escrow";
    case "approvals":
      return "Approvals";
    case "system":
      return "System & Webhooks";
    default:
      return category;
  }
}

/* =========================================================
   Page
========================================================= */

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>({
    cancellationSpike: false,
    merchantOnboarding: false,
    settlementDispatches: false,
    latencyAlerts: false,
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<
    "all" | NotificationCategory
  >("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [ledger, setLedger] = useState<SettlementLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  /* =======================================================
     Fetch notifications
  ======================================================= */

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);

      const response = await apiRequest<{
        notifications: Notification[];
        stats: NotificationStats;
      }>(API_ENDPOINTS.notifications);

      setNotifications(response.notifications || []);
      setStats(response.stats || null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications.",
      );
    }
  }, []);

  /* =======================================================
     Fetch settings
  ======================================================= */

  const loadSettings = useCallback(async () => {
    try {
      const response = await apiRequest<NotificationSettings>(
        API_ENDPOINTS.settings,
      );

      setSettings(response);
    } catch (err) {
      console.error("Unable to load notification settings:", err);
    }
  }, []);

  /* =======================================================
     Fetch system health
  ======================================================= */

  const loadSystemHealth = useCallback(async () => {
    try {
      const response = await apiRequest<SystemHealth>(
        API_ENDPOINTS.systemHealth,
      );

      setSystemHealth(response);
    } catch (err) {
      console.error("Unable to load system health:", err);
    }
  }, []);

  /* =======================================================
     Initial load
  ======================================================= */

  const loadPage = useCallback(async () => {
    setLoading(true);

    await Promise.all([
      loadNotifications(),
      loadSettings(),
      loadSystemHealth(),
    ]);

    setLoading(false);
  }, [loadNotifications, loadSettings, loadSystemHealth]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  /* =======================================================
     Refresh
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      loadNotifications(),
      loadSettings(),
      loadSystemHealth(),
    ]);

    setRefreshing(false);
  };

  /* =======================================================
     Mark all read
  ======================================================= */

  const markAllNotificationsRead = async () => {
    try {
      setActionLoading("mark-all");

      await apiRequest(API_ENDPOINTS.markAllRead, {
        method: "PATCH",
      });

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          status: "read",
        })),
      );

      setStats((current) =>
        current
          ? {
              ...current,
              unread: 0,
            }
          : current,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notifications as read.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =======================================================
     Dismiss notification
  ======================================================= */

  const dismissNotification = async (notificationId: string) => {
    try {
      setActionLoading(notificationId);

      await apiRequest(API_ENDPOINTS.dismiss(notificationId), {
        method: "DELETE",
      });

      setNotifications((current) =>
        current.filter(
          (notification) => notification.id !== notificationId,
        ),
      );

      setStats((current) => {
        if (!current) return current;

        const removed = notifications.find(
          (notification) => notification.id === notificationId,
        );

        return {
          ...current,
          total: Math.max(current.total - 1, 0),
          unread:
            removed?.status === "unread"
              ? Math.max(current.unread - 1, 0)
              : current.unread,
        };
      });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to dismiss notification.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =======================================================
     Clear read notifications
  ======================================================= */

  const clearReadNotifications = async () => {
    try {
      setActionLoading("clear-read");

      await apiRequest(API_ENDPOINTS.clearRead, {
        method: "DELETE",
      });

      setNotifications((current) =>
        current.filter((notification) => notification.status !== "read"),
      );

      setStats((current) =>
        current
          ? {
              ...current,
              total: current.unread,
            }
          : current,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to clear read notifications.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =======================================================
     Load settlement ledger
  ======================================================= */

  const openLedger = async (notification: Notification) => {
    const batchId =
      notification.metadata?.batchId || notification.id;

    try {
      setLedgerOpen(true);
      setLedgerLoading(true);
      setLedger(null);

      const response = await apiRequest<SettlementLedger>(
        API_ENDPOINTS.ledger(batchId),
      );

      setLedger(response);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load settlement ledger.",
      );
    } finally {
      setLedgerLoading(false);
    }
  };

  /* =======================================================
     Notification settings
  ======================================================= */

  const toggleSetting = async (
    key: keyof NotificationSettings,
  ) => {
    const nextValue = !settings[key];

    setSettings((current) => ({
      ...current,
      [key]: nextValue,
    }));

    try {
      await apiRequest(API_ENDPOINTS.settings, {
        method: "PATCH",
        body: JSON.stringify({
          [key]: nextValue,
        }),
      });
    } catch (err) {
      console.error(err);

      // Revert UI if backend update failed.
      setSettings((current) => ({
        ...current,
        [key]: !nextValue,
      }));

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notification rule.",
      );
    }
  };

  /* =======================================================
     Filter notifications
  ======================================================= */

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") {
      return notifications;
    }

    return notifications.filter((notification) =>
      getNotificationCategories(notification).includes(
        selectedCategory,
      ),
    );
  }, [notifications, selectedCategory]);

  /* =======================================================
     Category counts
  ======================================================= */

  const categoryCounts = useMemo(() => {
    const counts = {
      restaurants: 0,
      security: 0,
      escrow: 0,
      approvals: 0,
      system: 0,
    };

    notifications.forEach((notification) => {
      getNotificationCategories(notification).forEach((category) => {
        if (category in counts) {
          counts[category as keyof typeof counts]++;
        }
      });
    });

    return counts;
  }, [notifications]);

  /* =======================================================
     Date
  ======================================================= */

  const currentDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());

  /* =======================================================
     Loading
  ======================================================= */

if (loading) {
  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <AdminSidebar />

      <main className="min-h-screen ml-72">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 rounded-3xl bg-[#f0edec]" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-2xl bg-[#f0edec]"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-8">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 rounded-2xl bg-[#f0edec]"
                  />
                ))}
              </div>

              <div className="space-y-6 xl:col-span-4">
                <div className="h-96 rounded-2xl bg-[#f0edec]" />
                <div className="h-96 rounded-2xl bg-[#f0edec]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

  /* =======================================================
     Main
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b]">
      <AdminSidebar />

      <main className="min-h-screen pl-0 lg:pl-15">
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="sticky top-0 z-40 border-b border-[#e5e2e1]/60 bg-[#fcf9f8]/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-6 px-5 py-4 lg:px-16">
            <div className="flex max-w-xl flex-1 items-center">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#717976]">
                  search
                </span>

                <input
                  className="w-full rounded-xl bg-white py-2.5 pl-11 pr-4 outline-none shadow-[0_1px_8px_rgba(0,0,0,0.04)] placeholder:text-[#717976] focus:ring-2 focus:ring-[#01261f]"
                  placeholder="Search restaurants, reservations, customers, phone, or ID..."
                  type="text"
                />
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="hidden items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] xl:flex">
                <span className="h-2 w-2 rounded-full bg-[#01261f]" />

                <span className="text-xs font-medium text-[#414846]">
                  Network:{" "}
                  <strong className="font-semibold text-[#1c1b1b]">
                    {stats?.total ?? 0} Notifications
                  </strong>
                </span>
              </div>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f0edec]"
              >
                <span className="material-symbols-outlined text-[18px] text-[#717976]">
                  calendar_today
                </span>

                <span>Today, {currentDate}</span>
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh telemetry"
                className="rounded-xl bg-white p-2.5 text-[#717976] shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors hover:text-[#1c1b1b] disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    refreshing ? "animate-spin" : ""
                  }`}
                >
                  sync
                </span>
              </button>

              <button
                type="button"
                title="Admin notifications"
                className="relative rounded-xl bg-white p-2.5 text-[#717976] shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>

                {(stats?.unread ?? 0) > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#934a2d]" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <div className="w-full px-5 pb-16 pt-6 lg:px-16">
          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ba1a1a]/20 bg-[#ffdad6] p-4 text-[#93000a]">
              <span className="material-symbols-outlined text-[20px]">
                error
              </span>

              <div className="flex-1">
                <p className="font-semibold">
                  Unable to complete request
                </p>

                <p className="mt-1 text-sm">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-lg p-1 hover:bg-[#ba1a1a]/10"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
          )}

          {/* =================================================
              HERO
          ================================================= */}

          <section className="relative mb-8 overflow-hidden rounded-3xl bg-[#f6f3f2] p-6 shadow-sm lg:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#01261f]/5 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 right-64 h-80 w-80 rounded-full bg-[#934a2d]/5 blur-3xl" />

            <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#934a2d]" />

                  <span className="text-xs font-bold uppercase tracking-wider text-[#934a2d]">
                    Operations Command • Realtime Telemetry
                  </span>
                </div>

                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#01261f] lg:text-5xl">
                  Notifications &amp; System Alerts
                </h1>

                <p className="mt-2 text-base leading-relaxed text-[#414846]">
                  Stay informed with platform-wide restaurant
                  registrations, escrow settlements, compliance alerts,
                  and API health across all connected nodes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  disabled={
                    actionLoading === "mark-all" ||
                    (stats?.unread ?? 0) === 0
                  }
                  className="flex items-center gap-2 rounded-xl bg-[#01261f] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1a3c34] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {actionLoading === "mark-all"
                      ? "progress_activity"
                      : "done_all"}
                  </span>

                  <span>Mark All as Read</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1c1b1b] shadow-sm transition-all hover:bg-[#f0edec]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#717976]">
                    tune
                  </span>

                  <span>Notification Preferences</span>
                </button>

                <button
                  type="button"
                  onClick={clearReadNotifications}
                  disabled={actionLoading === "clear-read"}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#ba1a1a] shadow-sm transition-all hover:bg-[#ffdad6] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete_sweep
                  </span>

                  <span>Clear Read Alerts</span>
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {/* Unread */}
            <SummaryCard
              label="Priority Inbox"
              value={String(stats?.unread ?? 0)}
              suffix="Pending Review"
              icon="mark_email_unread"
              iconClass="bg-[#ffdbcf] text-[#380d00]"
              footer="Requires immediate admin audit"
              footerIcon="arrow_forward"
              footerColor="text-[#934a2d]"
            />

            {/* Regulatory */}
            <SummaryCard
              label="Regulatory Audit"
              value={String(stats?.regulatoryQueue ?? 0)}
              suffix="Queue"
              icon="verified_user"
              iconClass="bg-[#ffe088] text-[#241a00]"
              footer="Trade licenses & health permits"
              footerIcon="arrow_forward"
              footerColor="text-[#735c00]"
            />

            {/* Escrow */}
            <SummaryCard
              label="Escrow Settlements"
              value={
                stats?.settlementAmount !== undefined
                  ? new Intl.NumberFormat("en-US", {
                      maximumFractionDigits: 1,
                    }).format(stats.settlementAmount)
                  : "0"
              }
              suffix={stats?.settlementCurrency || "ETB"}
              icon="account_balance_wallet"
              iconClass="bg-[#c5eadf] text-[#00201a]"
              footer="Automated settlement activity"
              footerIcon="payments"
              footerColor="text-[#01261f]"
            />

            {/* Health */}
            <SummaryCard
              label="Mesh Health"
              value={`${(
                systemHealth?.uptime ??
                stats?.uptime ??
                0
              ).toFixed(2)}%`}
              suffix="Uptime"
              icon="hub"
              iconClass="bg-[#e5e2e1] text-[#01261f]"
              footer={`${
                systemHealth?.endpointsGreen ??
                stats?.endpointsGreen ??
                0
              } of ${
                systemHealth?.totalEndpoints ??
                stats?.totalEndpoints ??
                0
              } endpoints green`}
              footerIcon="dns"
              footerColor="text-[#01261f]"
            />
          </section>

          {/* =================================================
              MAIN GRID
          ================================================= */}

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            {/* =================================================
                LEFT FEED
            ================================================= */}

            <div className="flex flex-col gap-6 xl:col-span-8">
              {/* Filters */}
              <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
                <div className="flex min-w-max items-center gap-1">
                  <FilterButton
                    active={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Alerts
                    <span className="rounded-full bg-[#1a3c34] px-1.5 py-0.5 text-[11px] font-bold text-[#c5eadf]">
                      {stats?.unread ?? 0} unread /{" "}
                      {stats?.total ?? notifications.length}
                    </span>
                  </FilterButton>

                  <FilterButton
                    active={selectedCategory === "restaurants"}
                    onClick={() =>
                      setSelectedCategory("restaurants")
                    }
                  >
                    Restaurants
                    <CountBadge>
                      {categoryCounts.restaurants}
                    </CountBadge>
                  </FilterButton>

                  <FilterButton
                    active={selectedCategory === "security"}
                    onClick={() => setSelectedCategory("security")}
                  >
                    Users &amp; Security
                    <CountBadge>
                      {categoryCounts.security}
                    </CountBadge>
                  </FilterButton>

                  <FilterButton
                    active={selectedCategory === "escrow"}
                    onClick={() => setSelectedCategory("escrow")}
                  >
                    Reservations &amp; Escrow
                    <CountBadge>
                      {categoryCounts.escrow}
                    </CountBadge>
                  </FilterButton>

                  <FilterButton
                    active={selectedCategory === "approvals"}
                    onClick={() => setSelectedCategory("approvals")}
                  >
                    Approvals
                    <CountBadge>
                      {categoryCounts.approvals}
                    </CountBadge>
                  </FilterButton>

                  <FilterButton
                    active={selectedCategory === "system"}
                    onClick={() => setSelectedCategory("system")}
                  >
                    System &amp; Webhooks
                    <CountBadge>
                      {categoryCounts.system}
                    </CountBadge>
                  </FilterButton>
                </div>
              </div>

              {/* Notification list */}
              <div className="flex flex-col gap-4">
                {filteredNotifications.length === 0 ? (
                  <EmptyNotifications />
                ) : (
                  filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      actionLoading={actionLoading}
                      onDismiss={dismissNotification}
                      onOpenLedger={openLedger}
                    />
                  ))
                )}
              </div>
            </div>

            {/* =================================================
                RIGHT PANEL
            ================================================= */}

            <div className="flex flex-col gap-6 xl:col-span-4">
              {/* Channel Status */}
              <ChannelStatusCard
                systemHealth={systemHealth}
              />

              {/* Realtime rules */}
              <DispatchRulesCard
                settings={settings}
                onToggle={toggleSetting}
              />
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================
          LEDGER DRAWER
      ===================================================== */}

      {ledgerOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close ledger"
            onClick={() => setLedgerOpen(false)}
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#e5e2e1] pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#934a2d]">
                    Settlement Batch #
                    {ledger?.batchId || "..."}
                  </span>

                  <h3 className="mt-1 font-serif text-2xl font-bold text-[#01261f]">
                    {ledger?.institution ||
                      "Settlement Institution"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setLedgerOpen(false)}
                  className="rounded-xl p-2 text-[#717976] transition-colors hover:bg-[#f0edec]"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>
              </div>

              {ledgerLoading ? (
                <div className="mt-6 animate-pulse space-y-4">
                  <div className="h-20 rounded-xl bg-[#f0edec]" />

                  <div className="h-5 w-40 rounded bg-[#f0edec]" />

                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 rounded bg-[#f0edec]"
                    />
                  ))}
                </div>
              ) : ledger ? (
                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between rounded-xl bg-[#f6f3f2] p-4">
                    <span className="text-sm text-[#414846]">
                      Disbursed Total
                    </span>

                    <span className="font-serif text-xl font-bold text-[#01261f]">
                      {formatMoney(
                        ledger.total,
                        ledger.currency,
                      )}
                    </span>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#717976]">
                      Venues Credited
                    </p>

                    <div className="divide-y divide-[#e5e2e1]">
                      {ledger.venues.map((venue) => (
                        <div
                          key={`${venue.name}-${venue.amount}`}
                          className="flex items-center justify-between py-3"
                        >
                          <span className="text-sm text-[#1c1b1b]">
                            {venue.name}
                          </span>

                          <span className="text-sm font-bold text-[#01261f]">
                            {formatMoney(
                              venue.amount,
                              venue.currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-[#f6f3f2] p-5 text-sm text-[#414846]">
                  No ledger data was returned by the backend.
                </div>
              )}
            </div>

            <div className="border-t border-[#e5e2e1] pt-6">
              <button
                type="button"
                onClick={() => setLedgerOpen(false)}
                className="w-full rounded-xl bg-[#01261f] py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#1a3c34]"
              >
                Close Ledger Snapshot
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Summary Card
========================================================= */

function SummaryCard({
  label,
  value,
  suffix,
  icon,
  iconClass,
  footer,
  footerIcon,
  footerColor,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: string;
  iconClass: string;
  footer: string;
  footerIcon: string;
  footerColor: string;
}) {
  return (
    <div className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#414846]">
            {label}
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#01261f]">
              {value}
            </span>

            <span className="text-xs font-medium text-[#934a2d]">
              {suffix}
            </span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
        >
          <span className="material-symbols-outlined text-[24px]">
            {icon}
          </span>
        </div>
      </div>

      <div className="-mx-6 -mb-6 mt-4 flex items-center justify-between bg-[#f6f3f2] px-6 py-3">
        <span className="text-xs text-[#414846]">{footer}</span>

        <span
          className={`material-symbols-outlined text-[18px] ${footerColor}`}
        >
          {footerIcon}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   Filter Button
========================================================= */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-[#01261f] text-white"
          : "text-[#414846] hover:bg-[#f0edec] hover:text-[#1c1b1b]"
      }`}
    >
      {children}
    </button>
  );
}

function CountBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-md bg-[#e5e2e1] px-1.5 py-0.5 text-[11px] text-[#414846]">
      {children}
    </span>
  );
}

/* =========================================================
   Notification Card
========================================================= */

function NotificationCard({
  notification,
  actionLoading,
  onDismiss,
  onOpenLedger,
}: {
  notification: Notification;
  actionLoading: string | null;
  onDismiss: (id: string) => void;
  onOpenLedger: (notification: Notification) => void;
}) {
  const unread = notification.status === "unread";

  const accent = getNotificationAccent(notification);
  const icon = getNotificationIcon(notification);

  const categories = getNotificationCategories(notification);

  const isSettlement =
    notification.type?.toLowerCase().includes("settlement") ||
    categories.includes("escrow");

  const isOnboarding =
    notification.type?.toLowerCase().includes("onboard") ||
    categories.includes("approvals");

  return (
    <article
      className={`relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl p-6 shadow-sm transition-all hover:shadow-md md:flex-row ${
        unread
          ? "bg-white"
          : "bg-[#f6f3f2] opacity-80 hover:opacity-100"
      }`}
    >
      {unread && (
        <div
          className={`absolute bottom-6 left-0 top-6 w-1.5 rounded-r-full ${accent.border}`}
        />
      )}

      {/* Image / Icon */}
      {notification.imageUrl ? (
        <div className="relative shrink-0">
          <img
            src={notification.imageUrl}
            alt=""
            className={`h-16 w-16 rounded-xl object-cover shadow-sm ${
              unread ? "" : "grayscale-[30%]"
            }`}
          />

          {unread && (
            <span
              className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${accent.border}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
        </div>
      ) : (
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl shadow-sm ${accent.iconBg} ${accent.iconColor}`}
        >
          <span className="material-symbols-outlined text-[32px]">
            {icon}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#e5e2e1] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#414846]">
            {notification.type ||
              getCategoryLabel(notification.category)}
          </span>

          <span className="flex items-center gap-1 text-xs text-[#717976]">
            <span className="material-symbols-outlined text-[14px]">
              schedule
            </span>

            {formatRelativeTime(notification.createdAt)}

            {notification.node && ` • ${notification.node}`}
          </span>
        </div>

        <h3
          className={`font-serif text-xl font-bold leading-tight ${
            unread ? "text-[#01261f]" : "text-[#1c1b1b]"
          }`}
        >
          {notification.title}
        </h3>

        {notification.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-[#414846]">
            {notification.description}
          </p>
        )}

        {(notification.metadata?.licenseNumber ||
          notification.metadata?.amount ||
          notification.restaurantName) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {notification.restaurantName && (
              <span className="rounded-lg bg-[#f0edec] px-2.5 py-1 text-xs font-medium text-[#414846]">
                {notification.restaurantName}
              </span>
            )}

            {notification.metadata?.licenseNumber && (
              <span className="rounded-lg bg-[#f0edec] px-2.5 py-1 font-mono text-xs text-[#01261f]">
                #{notification.metadata.licenseNumber}
              </span>
            )}

           {notification.metadata?.amount != null && (
  <span className="rounded-lg bg-[#c5eadf] px-2.5 py-1 text-xs font-bold text-[#00201a]">
    {formatMoney(
      notification.metadata.amount,
      notification.metadata.currency || "ETB",
    )}
  </span>
)}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isOnboarding && (
            <button
              type="button"
              onClick={() => {
                /*
                  Replace this with your actual application route.

                  Example:
                  router.push(`/admin/restaurants/${notification.restaurantId}/review`)
                */
                console.log(
                  "Review application:",
                  notification.id,
                );
              }}
              className="flex items-center gap-2 rounded-xl bg-[#01261f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a3c34]"
            >
              <span className="material-symbols-outlined text-[16px]">
                visibility
              </span>

              <span>Review Application</span>
            </button>
          )}

          {isSettlement && (
            <button
              type="button"
              onClick={() => onOpenLedger(notification)}
              className="flex items-center gap-2 rounded-xl bg-[#ebe7e7] px-4 py-2 text-sm font-semibold text-[#01261f] transition-all hover:bg-[#e5e2e1]"
            >
              <span className="material-symbols-outlined text-[16px]">
                receipt_long
              </span>

              <span>View Batch Ledger</span>
            </button>
          )}

          {notification.restaurantId &&
            !isOnboarding &&
            !isSettlement && (
              <button
                type="button"
                onClick={() => {
                  console.log(
                    "Open restaurant:",
                    notification.restaurantId,
                  );
                }}
                className="flex items-center gap-2 rounded-xl bg-[#01261f] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a3c34]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  analytics
                </span>

                <span>Investigate Venue</span>
              </button>
            )}

          {notification.metadata?.phone && (
            <a
              href={`tel:${notification.metadata.phone}`}
              className="flex items-center gap-2 rounded-xl bg-[#f0edec] px-4 py-2 text-sm font-semibold text-[#1c1b1b] transition-all hover:bg-[#e5e2e1]"
            >
              <span className="material-symbols-outlined text-[16px] text-[#934a2d]">
                call
              </span>

              <span>Call Owner</span>
            </a>
          )}

          {unread && (
            <button
              type="button"
              disabled={actionLoading === notification.id}
              onClick={() => onDismiss(notification.id)}
              className="rounded-xl bg-[#f0edec] px-4 py-2 text-sm font-semibold text-[#1c1b1b] transition-all hover:bg-[#e5e2e1] disabled:opacity-50"
            >
              {actionLoading === notification.id
                ? "Dismissing..."
                : "Quick Dismiss"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   Empty State
========================================================= */

function EmptyNotifications() {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0edec] text-[#717976]">
        <span className="material-symbols-outlined text-[32px]">
          notifications_off
        </span>
      </div>

      <h3 className="mt-5 font-serif text-xl font-bold text-[#01261f]">
        No notifications found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#717976]">
        There are no notifications matching the selected category.
      </p>
    </div>
  );
}

/* =========================================================
   Channel Status
========================================================= */

function ChannelStatusCard({
  systemHealth,
}: {
  systemHealth: SystemHealth | null;
}) {
  const channels = systemHealth?.channels || [];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-[#01261f]">
          Channel Status
        </h2>

        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#01261f]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#01261f]" />
          Operational
        </span>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-[#414846]">
        Realtime delivery health of administrative emergency
        notifications and dispatch relays.
      </p>

      <div className="space-y-4">
        {channels.length === 0 ? (
          <div className="rounded-xl bg-[#f6f3f2] p-4 text-sm text-[#717976]">
            No channel telemetry returned by backend.
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.name}
              className="flex items-center justify-between rounded-xl bg-[#f6f3f2] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#01261f] shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">
                    {channel.icon || "notifications"}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1c1b1b]">
                    {channel.name}
                  </p>

                  {channel.description && (
                    <p className="truncate text-xs text-[#717976]">
                      {channel.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="ml-3 shrink-0 text-right">
                {channel.deliveryRate !== undefined ? (
                  <>
                    <span className="text-sm font-bold text-[#01261f]">
                      {channel.deliveryRate}%
                    </span>

                    <p className="text-[10px] text-[#717976]">
                      Delivery Rate
                    </p>
                  </>
                ) : (
                  <span className="rounded-md bg-[#c5eadf] px-2 py-1 text-[11px] font-bold capitalize text-[#00201a]">
                    {channel.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Latency */}
      {systemHealth?.webhookLatency && (
        <div className="mt-6 border-t border-[#f0edec] pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#414846]">
              Telebirr • CBE Webhook Latency (24h)
            </span>

            <span className="text-xs font-bold text-[#01261f]">
              {systemHealth.webhookLatency.average}
              {systemHealth.webhookLatency.unit} avg
            </span>
          </div>

          <LatencyChart
            points={systemHealth.webhookLatency.points}
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Latency Chart
========================================================= */

function LatencyChart({
  points,
}: {
  points: number[];
}) {
  if (!points.length) {
    return (
      <div className="h-12 rounded-lg bg-[#f6f3f2]" />
    );
  }

  const width = 300;
  const height = 50;

  const max = Math.max(...points);
  const min = Math.min(...points);

  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : (index / (points.length - 1)) * width;

    const y =
      height -
      ((point - min) / range) * (height - 10) -
      5;

    return `${x},${y}`;
  });

  const line = coordinates.join(" ");

  return (
    <svg
      className="h-12 w-full text-[#01261f]"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <polyline
        points={`0,${height} ${line} ${width},${height}`}
        fill="currentColor"
        fillOpacity="0.06"
        stroke="none"
      />
    </svg>
  );
}

/* =========================================================
   Dispatch Rules
========================================================= */

function DispatchRulesCard({
  settings,
  onToggle,
}: {
  settings: NotificationSettings;
  onToggle: (key: keyof NotificationSettings) => void;
}) {
  const rules: Array<{
    key: keyof NotificationSettings;
    title: string;
    description: string;
  }> = [
    {
      key: "cancellationSpike",
      title: "Instant Cancellation Spike",
      description: "> 5 drops / hour threshold",
    },
    {
      key: "merchantOnboarding",
      title: "Merchant Onboarding Submission",
      description: "Notify immediate vetting desk",
    },
    {
      key: "settlementDispatches",
      title: "Daily Settlement Dispatches",
      description: "23:00 EAT batch summary",
    },
    {
      key: "latencyAlerts",
      title: "Latency Alerts (>500ms)",
      description: "Telebirr & EthSwitch relays",
    },
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-serif text-2xl font-bold text-[#01261f]">
        Realtime Dispatch Rules
      </h2>

      <p className="mb-6 mt-2 text-sm leading-relaxed text-[#414846]">
        Toggle automated priority escalations to regional support
        coordinators.
      </p>

      <div className="space-y-4">
        {rules.map((rule) => (
          <label
            key={rule.key}
            className="flex cursor-pointer items-center justify-between rounded-xl bg-[#f6f3f2] p-3.5 transition-all hover:bg-[#f0edec]"
          >
            <div className="pr-4">
              <span className="block text-sm font-semibold text-[#1c1b1b]">
                {rule.title}
              </span>

              <span className="mt-0.5 block text-xs text-[#717976]">
                {rule.description}
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings[rule.key]}
              onClick={() => onToggle(rule.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                settings[rule.key]
                  ? "bg-[#01261f]"
                  : "bg-[#e5e2e1]"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  settings[rule.key]
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#ffdbcf] p-4 text-[#380d00]">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px]">
          security_update_good
        </span>

        <p className="text-xs leading-relaxed">
          Emergency SMS alerts bypass do-not-disturb protocols for
          designated Tier 4 Super Admins during off-peak hours.
        </p>
      </div>
    </div>
  );
}