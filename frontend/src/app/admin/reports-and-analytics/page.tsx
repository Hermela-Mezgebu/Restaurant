"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { apiFetch } from "@/lib/api";

type TimeRange = "today" | "7d" | "30d" | "90d" | "year";

interface Kpi {
  label: string;
  value: string;
  suffix?: string;
  comparison?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon:
    | "bookings"
    | "users"
    | "venues"
    | "money"
    | "cancel"
    | "shield";
  badge?: string;
}

interface ReservationPoint {
  label: string;
  confirmed: number;
  completed: number;
  pending: number;
  cancelled: number;
}

interface GeographicCluster {
  name: string;
  description?: string;
  percentage: number;
  bookings: number;
  activeVenues: number;
  note: string;
}

interface RetentionData {
  repeatRate: number;
  repeatPatrons: number;
  firstTimeDiners: number;
  averagePartySize: number;
  escrowProtection: number;
}

interface RestaurantPerformance {
  id: string;
  name: string;
  location: string;
  category: string;
  bookings: number;
  guests: number;
  averageTurnMinutes: number;
  grossProcessed: number;
  currency: string;
  escrowRate: number;
  cancellationRate: number;
  momVelocity: number;
}

interface SettlementData {
  name: string;
  percentage: number;
  amount: number;
  currency: string;
}

interface ReportData {
  generatedAt: string;
  timezone: string;

  kpis: Kpi[];

  reservationTrend: ReservationPoint[];

  geographicClusters: GeographicCluster[];

  retention: RetentionData;

  restaurants: RestaurantPerformance[];

  settlements: SettlementData[];

  insights: {
    title: string;
    description: string;
    label: string;
    metadata?: string;
  }[];

  peakDinnerWindow?: string;
  venuesTotal?: number;
  venuesActive?: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: ReportData;
}

function normalizeReportData(
  value: Partial<ReportData> | null | undefined,
): ReportData {
  return {
    generatedAt:
      typeof value?.generatedAt === "string"
        ? value.generatedAt
        : new Date().toISOString(),

    timezone:
      typeof value?.timezone === "string"
        ? value.timezone
        : "Africa/Addis_Ababa",

    kpis: Array.isArray(value?.kpis)
      ? value.kpis
      : [],

    reservationTrend: Array.isArray(
      value?.reservationTrend,
    )
      ? value.reservationTrend
      : [],

    geographicClusters: Array.isArray(
      value?.geographicClusters,
    )
      ? value.geographicClusters
      : [],

    retention: {
      repeatRate:
        Number(value?.retention?.repeatRate) || 0,

      repeatPatrons:
        Number(value?.retention?.repeatPatrons) || 0,

      firstTimeDiners:
        Number(value?.retention?.firstTimeDiners) || 0,

      averagePartySize:
        Number(value?.retention?.averagePartySize) || 0,

      escrowProtection:
        Number(value?.retention?.escrowProtection) || 0,
    },

    restaurants: Array.isArray(
      value?.restaurants,
    )
      ? value.restaurants
      : [],

    settlements: Array.isArray(
      value?.settlements,
    )
      ? value.settlements
      : [],

    insights: Array.isArray(value?.insights)
      ? value.insights
      : [],

    peakDinnerWindow:
      typeof value?.peakDinnerWindow === "string"
        ? value.peakDinnerWindow
        : undefined,

    venuesTotal:
      typeof value?.venuesTotal === "number"
        ? value.venuesTotal
        : 0,

    venuesActive:
      typeof value?.venuesActive === "number"
        ? value.venuesActive
        : 0,
  };
}

const DEFAULT_RANGE: TimeRange = "30d";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  year: "This Year",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(
  value: number,
  currency = "ETB",
  compact = false,
) {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M ${currency}`;
  }

  if (compact && Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K ${currency}`;
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "search"
    | "calendar"
    | "refresh"
    | "notification"
    | "download"
    | "pdf"
    | "bookings"
    | "users"
    | "venues"
    | "money"
    | "cancel"
    | "shield"
    | "analytics"
    | "map"
    | "loyalty"
    | "restaurant"
    | "filter"
    | "sort"
    | "arrowUp"
    | "arrowDown"
    | "eco"
    | "payments";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-14.7-4L3 10" />
          <path d="M3 5v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 14.7 4L21 14" />
          <path d="M21 19v-5h-5" />
        </svg>
      );

    case "notification":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      );

    case "pdf":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h2a2 2 0 0 1 0 4H8zM14 17v-4h1a2 2 0 0 1 0 4z" />
        </svg>
      );

    case "bookings":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
          <path d="M8 14h2M14 14h2M8 18h2" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "venues":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6M9 9h.01M12 9h.01M15 9h.01M9 12h.01M15 12h.01" />
        </svg>
      );

    case "money":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M7 9h.01M17 15h.01" />
        </svg>
      );

    case "cancel":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "analytics":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h17" />
          <path d="m7 15 4-5 3 3 5-7" />
        </svg>
      );

    case "map":
      return (
        <svg {...common}>
          <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );

    case "loyalty":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-4.7-7.3" />
          <path d="M20 4v5h-5" />
          <path d="M12 8v4l3 2" />
        </svg>
      );

    case "restaurant":
      return (
        <svg {...common}>
          <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10" />
          <path d="M17 3v18M17 3c3 2 3 6 0 8" />
        </svg>
      );

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 5h16M7 12h10M10 19h4" />
        </svg>
      );

    case "sort":
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h8M8 18h4" />
          <path d="m4 7 2-2 2 2M6 5v14" />
        </svg>
      );

    case "arrowUp":
      return (
        <svg {...common}>
          <path d="m6 9 6-6 6 6M12 3v18" />
        </svg>
      );

    case "arrowDown":
      return (
        <svg {...common}>
          <path d="m6 15 6 6 6-6M12 21V3" />
        </svg>
      );

    case "eco":
      return (
        <svg {...common}>
          <path d="M20 4c-7 0-13 3-13 9 0 4 3 7 7 7 6 0 7-6 6-16Z" />
          <path d="M4 21c2-5 6-8 11-10" />
        </svg>
      );

    case "payments":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );

    default:
      return null;
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[#c1c8c4] bg-[#f6f3f2] p-8 text-center text-sm text-[#414846]">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-xl bg-[#ebe7e7]"
          />
        ))}
      </div>

      <div className="h-[400px] animate-pulse rounded-xl bg-[#ebe7e7]" />
      <div className="h-[350px] animate-pulse rounded-xl bg-[#ebe7e7]" />
    </div>
  );
}

function KpiIcon({
  icon,
}: {
  icon: Kpi["icon"];
}) {
  return <Icon name={icon} size={20} />;
}

function ReservationChart({
  data,
}: {
  data: ReservationPoint[];
}) {
  if (!data.length) {
    return <EmptyState message="No reservation trend data is available." />;
  }

  const width = 1000;
  const height = 280;
  const paddingX = 12;
  const paddingY = 25;

  const allValues = data.flatMap((item) => [
    item.confirmed,
    item.completed,
    item.pending,
    item.cancelled,
  ]);

  const max = Math.max(...allValues, 1);

  const getX = (index: number) => {
    if (data.length === 1) return width / 2;

    return (
      paddingX +
      (index / (data.length - 1)) * (width - paddingX * 2)
    );
  };

  const getY = (value: number) => {
    return (
      height -
      paddingY -
      (value / max) * (height - paddingY * 2)
    );
  };

  const points = (
    key: keyof Omit<ReservationPoint, "label">,
  ) =>
    data
      .map(
        (item, index) =>
          `${getX(index)},${getY(Number(item[key]))}`,
      )
      .join(" ");

  const latest = data[data.length - 1];

  return (
    <div className="w-full">
      <div className="relative h-[280px] w-full">
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {[25, 85, 145, 205].map((y) => (
            <line
              key={y}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="#ebe7e7"
              strokeDasharray="4 4"
            />
          ))}

          <polyline
            points={points("confirmed")}
            fill="none"
            stroke="#01261f"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={points("completed")}
            fill="none"
            stroke="#cba72f"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={points("pending")}
            fill="none"
            stroke="#aacec3"
            strokeWidth="3"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          <polyline
            points={points("cancelled")}
            fill="none"
            stroke="#934a2d"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {data.map((item, index) => (
            <circle
              key={`${item.label}-${index}`}
              cx={getX(index)}
              cy={getY(item.confirmed)}
              r={index === data.length - 1 ? 6 : 4}
              fill="#01261f"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="absolute right-4 top-2 hidden items-center gap-2 rounded-lg bg-[#01261f] px-3 py-2 text-white shadow-lg md:flex">
          <Icon name="shield" size={15} />

          <div className="text-[11px] leading-tight">
            <p className="font-bold">Latest period</p>
            <p className="text-white/70">
              {formatNumber(latest.confirmed)} confirmed
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 overflow-x-auto pt-3 text-[11px] font-medium text-[#414846]">
        {data.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            className="whitespace-nowrap"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RetentionChart({
  data,
}: {
  data: RetentionData;
}) {
  const repeat = Math.min(Math.max(data.repeatRate, 0), 100);
  const circumference = 2 * Math.PI * 38;
  const repeatDash = (repeat / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-2 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#ebe7e7"
            strokeWidth="12"
          />

          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#01261f"
            strokeWidth="12"
            strokeDasharray={`${repeatDash} ${circumference}`}
            strokeLinecap="butt"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-[Playfair_Display] text-3xl font-bold text-[#01261f]">
            {repeat.toFixed(1)}%
          </span>

          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#934a2d]">
            Repeat Rate
          </span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="rounded-lg bg-[#f6f3f2] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#01261f]" />
              <span className="text-sm font-bold text-[#1c1b1b]">
                Repeat Club Patrons
              </span>
            </div>

            <span className="text-sm font-bold text-[#01261f]">
              {formatNumber(data.repeatPatrons)}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-[#414846]">
            Customers returning within the configured retention window
          </p>
        </div>

        <div className="rounded-lg bg-[#f6f3f2] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffa17e]" />
              <span className="text-sm font-bold text-[#1c1b1b]">
                First-Time Diners
              </span>
            </div>

            <span className="text-sm font-bold text-[#934a2d]">
              {formatNumber(data.firstTimeDiners)}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-[#414846]">
            New customers recorded during this reporting period
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsAndAnalyticsPage() {
  const [range, setRange] =
    useState<TimeRange>(DEFAULT_RANGE);

  const [data, setData] = useState<ReportData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const [sortBy, setSortBy] = useState<
    "bookings" | "grossProcessed" | "momVelocity"
  >("bookings");

  const [corridorFilter, setCorridorFilter] =
    useState("all");

const loadReport = useCallback(async () => {
  setLoading(true);
  setRefreshing(true);
  setError("");

  try {
    const response = await apiFetch<ApiResponse>(
      `/admin/reports?range=${range}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.success) {
      throw new Error(
        response.error ||
          response.message ||
          "Failed to load analytics data.",
      );
    }

    if (!response.data) {
      throw new Error(
        "The analytics API returned no data.",
      );
    }

    const normalizedData = normalizeReportData(
      response.data,
    );

    setData(normalizedData);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load analytics.",
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [range]);

useEffect(() => {
  void loadReport();
}, [loadReport]);

const filteredRestaurants = useMemo(() => {
  if (!data) return [];

  const restaurants = data.restaurants ?? [];

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  const filtered = restaurants.filter(
    (restaurant) => {
      const restaurantName =
        restaurant.name?.toLowerCase() ?? "";

      const restaurantLocation =
        restaurant.location?.toLowerCase() ?? "";

      const restaurantCategory =
        restaurant.category?.toLowerCase() ?? "";

      const matchesSearch =
        !normalizedSearch ||
        restaurantName.includes(normalizedSearch) ||
        restaurantLocation.includes(normalizedSearch) ||
        restaurantCategory.includes(normalizedSearch);

      const matchesCorridor =
        corridorFilter === "all" ||
        restaurantLocation.includes(
          corridorFilter.toLowerCase(),
        );

      return (
        matchesSearch &&
        matchesCorridor
      );
    },
  );

  return [...filtered].sort((a, b) => {
    if (sortBy === "grossProcessed") {
      return b.grossProcessed - a.grossProcessed;
    }

    if (sortBy === "momVelocity") {
      return b.momVelocity - a.momVelocity;
    }

    return b.bookings - a.bookings;
  });
}, [
  data,
  search,
  corridorFilter,
  sortBy,
]);

  const exportCsv = () => {
    if (!data) return;

    const headers = [
      "Restaurant",
      "Location",
      "Category",
      "Bookings",
      "Guests",
      "Average Turn Minutes",
      "Gross Processed",
      "Currency",
      "Escrow Rate",
      "Cancellation Rate",
      "MoM Velocity",
    ];

    const rows = filteredRestaurants.map(
      (restaurant) => [
        restaurant.name,
        restaurant.location,
        restaurant.category,
        restaurant.bookings,
        restaurant.guests,
        restaurant.averageTurnMinutes,
        restaurant.grossProcessed,
        restaurant.currency,
        restaurant.escrowRate,
        restaurant.cancellationRate,
        restaurant.momVelocity,
      ],
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `dineet-report-${range}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b]">
      <AdminSidebar />

      <div className="lg:pl-25">
        <header className="fixed left-0 right-0 top-0 z-40 h-20 border-b border-[#ebe7e7] bg-[#fcf9f8]/90 backdrop-blur-xl lg:left-72">
          <div className="flex h-20 items-center justify-between gap-4 px-5 lg:px-8 xl:px-16">
            <div className="relative hidden w-full max-w-xl md:block">
              <Icon
                name="search"
                size={19}
              />

              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717976]">
                <Icon
                  name="search"
                  size={19}
                />
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search restaurants, customers, reservations..."
                className="w-full rounded-xl border border-transparent bg-white py-2.5 pl-11 pr-4 text-sm outline-none shadow-sm transition focus:border-[#01261f] focus:ring-2 focus:ring-[#c5eadf]"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden rounded-xl bg-white px-3 py-2 text-xs shadow-sm xl:block">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#01261f]" />
                Network:{" "}
                <strong>
                  {data?.venuesTotal ?? "—"} Venues
                </strong>
              </div>

              <div className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-sm lg:flex">
                <Icon
                  name="calendar"
                  size={17}
                />
                {data
                  ? formatDate(data.generatedAt)
                  : "Loading..."}
              </div>

            <button
  type="button"
  onClick={() => void loadReport()}
  disabled={refreshing}
  className="rounded-xl bg-white p-2.5 text-[#414846] shadow-sm transition hover:bg-[#f0edec] disabled:cursor-not-allowed disabled:opacity-50"
  title="Refresh analytics"
>
                <span
                  className={
                    refreshing
                      ? "block animate-spin"
                      : "block"
                  }
                >
                  <Icon
                    name="refresh"
                    size={19}
                  />
                </span>
              </button>

              <button
                type="button"
                className="relative rounded-xl bg-white p-2.5 text-[#414846] shadow-sm transition hover:bg-[#f0edec]"
                title="Notifications"
              >
                <Icon
                  name="notification"
                  size={19}
                />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#934a2d]" />
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#01261f] text-white">
                <span className="text-sm font-semibold">
                  A
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-5 pb-16 pt-28 lg:px-8 xl:px-16">
          <div className="mx-auto max-w-[1800px] space-y-8">
            <section className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
              <div className="max-w-3xl space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c5eadf] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#00201a]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#01261f]" />
                    Live Analytics
                  </span>

                  {data && (
                    <span className="text-xs font-medium text-[#414846]">
                      Updated{" "}
                      {formatDate(
                        data.generatedAt,
                      )}{" "}
                      • {data.timezone}
                    </span>
                  )}
                </div>

                <h1 className="font-[Playfair_Display] text-4xl font-bold tracking-tight text-[#01261f] md:text-5xl">
                  Reports & Analytics
                </h1>

                <p className="max-w-3xl text-base leading-7 text-[#414846]">
                  Analyze platform bookings, settlement
                  activity, venue performance, and customer
                  retention using live operational data.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap rounded-xl bg-[#f0edec] p-1">
                  {(
                    Object.keys(
                      RANGE_LABELS,
                    ) as TimeRange[]
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setRange(item)
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        range === item
                          ? "bg-white text-[#01261f] shadow-sm"
                          : "text-[#414846] hover:text-[#1c1b1b]"
                      }`}
                    >
                      {RANGE_LABELS[item]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!data}
                  className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-[#f0edec] disabled:opacity-50"
                >
                  <Icon
                    name="download"
                    size={17}
                  />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={printReport}
                  disabled={!data}
                  className="flex items-center gap-2 rounded-xl bg-[#01261f] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a3c34] disabled:opacity-50"
                >
                  <Icon
                    name="pdf"
                    size={17}
                  />
                  Export Executive Dossier
                </button>
              </div>
            </section>

            {error && (
              <section className="rounded-xl border border-[#ffdad6] bg-[#fff1ef] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#93000a]">
                      Unable to load analytics
                    </p>
                    <p className="mt-1 text-sm text-[#6f3030]">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadReport()
                    }
                    className="rounded-lg bg-[#ba1a1a] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              </section>
            )}

            {loading ? (
              <LoadingState />
            ) : data ? (
              <>
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                  {data.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="flex min-h-[165px] flex-col justify-between rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-lg bg-[#f0edec] p-2.5 text-[#01261f]">
                          <KpiIcon
                            icon={kpi.icon}
                          />
                        </div>

                        {kpi.change && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
                              kpi.changeType ===
                              "negative"
                                ? "bg-[#ffdbcf] text-[#753318]"
                                : kpi.changeType ===
                                    "neutral"
                                  ? "bg-[#e5e2e1] text-[#414846]"
                                  : "bg-[#c5eadf] text-[#00201a]"
                            }`}
                          >
                            {kpi.changeType ===
                              "negative" ? (
                              <Icon
                                name="arrowDown"
                                size={12}
                              />
                            ) : (
                              <Icon
                                name="arrowUp"
                                size={12}
                              />
                            )}
                            {kpi.change}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#717976]">
                          {kpi.label}
                        </p>

                        <h3 className="mt-1 font-[Playfair_Display] text-3xl font-bold text-[#1c1b1b]">
                          {kpi.value}
                          {kpi.suffix && (
                            <span className="ml-1 text-sm font-normal text-[#717976]">
                              {kpi.suffix}
                            </span>
                          )}
                        </h3>

                        {kpi.comparison && (
                          <p className="mt-1 text-[11px] text-[#717976]">
                            {kpi.comparison}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="rounded-xl bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#01261f]">
                          <Icon
                            name="analytics"
                            size={20}
                          />
                        </span>

                        <h2 className="font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                          Reservations Over Time
                        </h2>
                      </div>

                      <p className="mt-1 text-sm text-[#414846]">
                        Reservation confirmation,
                        completion, pending, and
                        cancellation trajectory for the
                        selected reporting period.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-[#01261f]" />
                        Confirmed
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-[#cba72f]" />
                        Completed
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-[#aacec3]" />
                        Pending
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-[#934a2d]" />
                        Cancelled
                      </div>

                      {data.peakDinnerWindow && (
                        <span className="rounded-full bg-[#ffdbcf] px-3 py-1.5 font-semibold text-[#753318]">
                          Peak:{" "}
                          {data.peakDinnerWindow}
                        </span>
                      )}
                    </div>
                  </div>

                  <ReservationChart
                    data={data.reservationTrend}
                  />
                </section>

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="flex flex-col justify-between space-y-6 rounded-xl bg-white p-5 shadow-sm lg:col-span-7 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#01261f]">
                            <Icon
                              name="map"
                              size={20}
                            />
                          </span>

                          <h3 className="font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                            Geographic Quarter Density
                          </h3>
                        </div>

                        <p className="mt-1 text-sm text-[#414846]">
                          Booking distribution across the
                          active restaurant corridors.
                        </p>
                      </div>

                      <span className="whitespace-nowrap rounded-md bg-[#f0edec] px-2.5 py-1 text-[11px] font-semibold text-[#414846]">
                        {data.geographicClusters.length}{" "}
                        Clusters
                      </span>
                    </div>

                    {data.geographicClusters.length ? (
                      <div className="space-y-5">
                        {data.geographicClusters.map(
                          (cluster) => (
                            <div
                              key={cluster.name}
                              className="space-y-1.5"
                            >
                              <div className="flex flex-col justify-between gap-1 text-sm sm:flex-row sm:items-center">
                                <span className="font-bold">
                                  {cluster.name}
                                  {cluster.description && (
                                    <span className="ml-1 font-normal text-[#717976]">
                                      (
                                      {
                                        cluster.description
                                      }
                                      )
                                    </span>
                                  )}
                                </span>

                                <span className="font-bold text-[#01261f]">
                                  {cluster.percentage.toFixed(
                                    1,
                                  )}
                                  %
                                  <span className="ml-1 font-normal text-[#717976]">
                                    (
                                    {formatNumber(
                                      cluster.bookings,
                                    )}{" "}
                                    bookings)
                                  </span>
                                </span>
                              </div>

                              <div className="h-3 overflow-hidden rounded-full bg-[#e5e2e1]">
                                <div
                                  className="h-full rounded-full bg-[#01261f]"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        cluster.percentage,
                                        0,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>

                              <p className="text-[11px] text-[#717976]">
                                {
                                  cluster.activeVenues
                                }{" "}
                                active venues •{" "}
                                {cluster.note}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <EmptyState message="No geographic analytics are available." />
                    )}
                  </div>

                  <div className="flex flex-col justify-between space-y-6 rounded-xl bg-white p-5 shadow-sm lg:col-span-5 md:p-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#01261f]">
                          <Icon
                            name="loyalty"
                            size={20}
                          />
                        </span>

                        <h3 className="font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                          Patron Retention
                        </h3>
                      </div>

                      <p className="mt-1 text-sm text-[#414846]">
                        Customer retention and repeat booking
                        activity.
                      </p>
                    </div>

                    <RetentionChart
                      data={data.retention}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#f0edec] p-3 text-center">
                        <span className="text-[11px] font-medium uppercase text-[#717976]">
                          Avg Party Size
                        </span>

                        <p className="mt-1 font-[Playfair_Display] text-xl font-bold text-[#01261f]">
                          {data.retention.averagePartySize.toFixed(
                            1,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f0edec] p-3 text-center">
                        <span className="text-[11px] font-medium uppercase text-[#717976]">
                          Escrow Protection
                        </span>

                        <p className="mt-1 font-[Playfair_Display] text-xl font-bold text-[#01261f]">
                          {data.retention.escrowProtection.toFixed(
                            1,
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#01261f]">
                          <Icon
                            name="restaurant"
                            size={20}
                          />
                        </span>

                        <h2 className="font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                          Restaurant Performance
                        </h2>
                      </div>

                      <p className="mt-1 text-sm text-[#414846]">
                        Performance metrics from the live
                        restaurant dataset.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <select
                          value={corridorFilter}
                          onChange={(event) =>
                            setCorridorFilter(
                              event.target.value,
                            )
                          }
                          className="appearance-none rounded-lg bg-[#f0edec] py-2 pl-9 pr-8 text-xs font-semibold outline-none"
                        >
                          <option value="all">
                            All Corridors
                          </option>
{Array.from(
  new Set(
    (data.restaurants ?? []).map(
      (restaurant) =>
        restaurant.location,
    ),
  ),
).map((location) => (
                            <option
                              key={location}
                              value={location}
                            >
                              {location}
                            </option>
                          ))}
                        </select>

                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#414846]">
                          <Icon
                            name="filter"
                            size={15}
                          />
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(event) =>
                            setSortBy(
                              event.target.value as
                                | "bookings"
                                | "grossProcessed"
                                | "momVelocity",
                            )
                          }
                          className="appearance-none rounded-lg bg-[#f0edec] py-2 pl-9 pr-8 text-xs font-semibold outline-none"
                        >
                          <option value="bookings">
                            Sort by Volume
                          </option>
                          <option value="grossProcessed">
                            Sort by Revenue
                          </option>
                          <option value="momVelocity">
                            Sort by Growth
                          </option>
                        </select>

                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#414846]">
                          <Icon
                            name="sort"
                            size={15}
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f6f3f2] text-[11px] uppercase tracking-wider text-[#717976]">
                          <th className="rounded-l-xl px-4 py-3.5">
                            Restaurant
                          </th>

                          <th className="px-4 py-3.5 text-right">
                            Bookings
                          </th>

                          <th className="px-4 py-3.5 text-right">
                            Guests
                          </th>

                          <th className="px-4 py-3.5 text-center">
                            Avg Turn
                          </th>

                          <th className="px-4 py-3.5 text-right">
                            Gross Processed
                          </th>

                          <th className="px-4 py-3.5 text-center">
                            Escrow
                          </th>

                          <th className="px-4 py-3.5 text-center">
                            Cancel %
                          </th>

                          <th className="rounded-r-xl px-4 py-3.5 text-right">
                            MoM
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#f0edec]">
                        {filteredRestaurants.length ? (
                          filteredRestaurants.map(
                            (restaurant) => (
                              <tr
                                key={restaurant.id}
                                className="transition hover:bg-[#f6f3f2]/60"
                              >
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0edec] text-[#01261f]">
                                      <Icon
                                        name="restaurant"
                                        size={19}
                                      />
                                    </div>

                                    <div>
                                      <p className="text-sm font-bold text-[#1c1b1b]">
                                        {
                                          restaurant.name
                                        }
                                      </p>

                                      <p className="text-[11px] text-[#717976]">
                                        {
                                          restaurant.location
                                        }{" "}
                                        •{" "}
                                        {
                                          restaurant.category
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-4 text-right text-sm font-bold">
                                  {formatNumber(
                                    restaurant.bookings,
                                  )}
                                </td>

                                <td className="px-4 py-4 text-right text-xs text-[#717976]">
                                  {formatNumber(
                                    restaurant.guests,
                                  )}
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="rounded-md bg-[#f0edec] px-2.5 py-1 text-xs font-medium">
                                    {
                                      restaurant.averageTurnMinutes
                                    }{" "}
                                    mins
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-right text-sm font-bold text-[#01261f]">
                                  {formatCurrency(
                                    restaurant.grossProcessed,
                                    restaurant.currency,
                                    true,
                                  )}
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="font-semibold text-[#01261f]">
                                    {restaurant.escrowRate.toFixed(
                                      1,
                                    )}
                                    %
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center text-xs text-[#717976]">
                                  {restaurant.cancellationRate.toFixed(
                                    1,
                                  )}
                                  %
                                </td>

                                <td className="px-4 py-4 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-bold ${
                                      restaurant.momVelocity >=
                                      0
                                        ? "text-[#01261f]"
                                        : "text-[#934a2d]"
                                    }`}
                                  >
                                    <Icon
                                      name={
                                        restaurant.momVelocity >=
                                        0
                                          ? "arrowUp"
                                          : "arrowDown"
                                      }
                                      size={13}
                                    />

                                    {restaurant.momVelocity >=
                                    0
                                      ? "+"
                                      : ""}
                                    {restaurant.momVelocity.toFixed(
                                      1,
                                    )}
                                    %
                                  </span>
                                </td>
                              </tr>
                            ),
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-10"
                            >
                              <EmptyState message="No restaurants match the current filters." />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-3 border-t border-[#f0edec] pt-4 text-xs text-[#717976] sm:flex-row">
                    <span>
                      Displaying{" "}
                      {filteredRestaurants.length} of{" "}
                      {(data.restaurants ?? []).length} restaurants
                    </span>

                    <span>
                      Data generated in{" "}
                      {data.timezone}
                    </span>
                  </div>
                </section>

                {data.insights.length > 0 && (
                  <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {data.insights.map(
                      (insight, index) => (
                        <div
                          key={`${insight.title}-${index}`}
                          className="rounded-xl bg-white p-6 shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ffdbcf] text-[#934a2d]">
                              {index === 0 ? (
                                <Icon
                                  name="eco"
                                  size={24}
                                />
                              ) : (
                                <Icon
                                  name="payments"
                                  size={24}
                                />
                              )}
                            </div>

                            <div>
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#934a2d]">
                                  {insight.label}
                                </span>

                                {insight.metadata && (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#934a2d]" />

                                    <span className="text-[11px] text-[#717976]">
                                      {
                                        insight.metadata
                                      }
                                    </span>
                                  </>
                                )}
                              </div>

                              <h3 className="font-[Playfair_Display] text-xl font-bold text-[#01261f]">
                                {insight.title}
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-[#414846]">
                                {
                                  insight.description
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </section>
                )}

                {data.settlements.length > 0 && (
                  <section className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="text-[#01261f]">
                        <Icon
                          name="payments"
                          size={21}
                        />
                      </span>

                      <div>
                        <h2 className="font-[Playfair_Display] text-2xl font-bold text-[#01261f]">
                          Settlement Rails
                        </h2>

                        <p className="text-sm text-[#414846]">
                          Payment distribution for the
                          selected reporting period.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex h-4 overflow-hidden rounded-full bg-[#e5e2e1]">
                        {data.settlements.map(
                          (settlement, index) => (
                            <div
                              key={settlement.name}
                              className={
                                index % 2 === 0
                                  ? "bg-[#01261f]"
                                  : "bg-[#cba72f]"
                              }
                              style={{
                                width: `${settlement.percentage}%`,
                              }}
                              title={`${settlement.name}: ${settlement.percentage}%`}
                            />
                          ),
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {data.settlements.map(
                          (settlement, index) => (
                            <div
                              key={settlement.name}
                              className="flex items-center justify-between rounded-xl bg-[#f6f3f2] p-4"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-3 w-3 rounded-full ${
                                    index % 2 === 0
                                      ? "bg-[#01261f]"
                                      : "bg-[#cba72f]"
                                  }`}
                                />

                                <span className="text-sm font-bold">
                                  {settlement.name}
                                </span>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-bold text-[#01261f]">
                                  {
                                    settlement.percentage
                                  }
                                  %
                                </p>

                                <p className="text-[11px] text-[#717976]">
                                  {formatCurrency(
                                    settlement.amount,
                                    settlement.currency,
                                    true,
                                  )}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <EmptyState message="No analytics data is available." />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}