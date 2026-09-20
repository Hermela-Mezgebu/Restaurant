"use client";

import { usePathname, useRouter } from "next/navigation";

type Tab =
  | "dashboard"
  | "reservations"
  | "tables"
  | "restaurant"
  | "profile";

interface StaffSidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  restaurantName: string;
  displayName: string;
}

const COLORS = {
  primary: "#01261f",
  primaryContainer: "#1a3c34",
  primaryFixed: "#c5eadf",
  secondary: "#934a2d",
  surfaceLow: "#f6f3f2",
  surfaceContainer: "#f0edec",
  onSurface: "#1c1b1b",
  outline: "#717976",
  tertiaryContainer: "#cba72f",
};

export default function StaffSidebar({
  activeTab,
  setActiveTab,
  restaurantName,
  displayName,
}: StaffSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = (tab: Tab, path: string) => {
    setActiveTab(tab);
    router.push(path);
  };

  const isTablesPage =
    pathname === "/staff/floor-tables" ||
    pathname.startsWith("/staff/floor-tables/");

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col justify-between border-r"
      style={{
        backgroundColor: COLORS.surfaceLow,
        borderColor: "rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex flex-col">
        {/* BRAND */}
        <div className="flex h-16 items-center gap-3 px-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: COLORS.primaryContainer,
              color: "#fff",
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              table_restaurant
            </span>
          </div>

          <div className="flex flex-col">
            <span
              className="staff-headline text-2xl font-semibold tracking-tight"
              style={{ color: COLORS.primary }}
            >
              DINEET
            </span>

            <span
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: COLORS.outline }}
            >
              Staff Ops
            </span>
          </div>
        </div>

        {/* RESTAURANT */}
        <div className="px-6 py-2">
          <div
            className="flex items-center justify-between rounded-lg p-3 shadow-sm"
            style={{
              backgroundColor: "#fff",
            }}
          >
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate text-[10px] uppercase tracking-wider"
                style={{ color: COLORS.outline }}
              >
                Location
              </span>

              <span
                className="truncate text-xs font-semibold"
                style={{ color: COLORS.onSurface }}
              >
                {restaurantName}
              </span>
            </div>

            <div
              className="h-2 w-2 rounded-full ring-4"
              style={{
                backgroundColor: COLORS.primary,
                boxShadow: `0 0 0 4px ${COLORS.primaryFixed}`,
              }}
            />
          </div>
        </div>

        {/* FLOOR MANAGEMENT */}
        <div className="px-2 pt-3">
          <div
            className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: COLORS.outline }}
          >
            Floor Management
          </div>

          <nav className="space-y-1">
            <SidebarButton
              active={activeTab === "dashboard"}
              icon="space_dashboard"
              label="Staff Dashboard"
              onClick={() => navigateTo("dashboard", "/staff")}
            />

            <SidebarButton
              active={activeTab === "reservations"}
              icon="book_online"
              label="Reservations & Bookings"
              onClick={() =>
                navigateTo("reservations", "/staff?tab=reservations")
              }
            />

            <SidebarButton
              active={activeTab === "tables" || isTablesPage}
              icon="table_restaurant"
              label="Floor & Tables"
              onClick={() =>
                navigateTo("tables", "/staff/floor-tables")
              }
            />
          </nav>
        </div>

        {/* OPERATIONS ADMIN */}
        <div className="px-2 pt-6">
          <div
            className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: COLORS.outline }}
          >
            Operations Admin
          </div>

          <nav className="space-y-1">
            <SidebarButton
              active={activeTab === "restaurant"}
              icon="storefront"
              label="Venue Details"
              onClick={() =>
                navigateTo("restaurant", "/staff?tab=restaurant")
              }
            />

            <SidebarButton
              active={activeTab === "profile"}
              icon="badge"
              label="Staff Account"
              onClick={() =>
                navigateTo("profile", "/staff?tab=profile")
              }
            />
          </nav>
        </div>
      </div>

      {/* SESSION STATUS */}
      <div className="p-6">
        <div
          className="flex items-center justify-between rounded-lg p-3"
          style={{
            backgroundColor: COLORS.surfaceContainer,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{
                backgroundColor: COLORS.tertiaryContainer,
              }}
            />

            <div className="flex flex-col">
              <span className="text-[11px] font-semibold">
                Service Session Active
              </span>

              <span
                className="text-[10px]"
                style={{ color: COLORS.outline }}
              >
                {displayName}
              </span>
            </div>
          </div>

          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: COLORS.outline }}
          >
            schedule
          </span>
        </div>
      </div>
    </aside>
  );
}

function SidebarButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: active
          ? COLORS.primaryContainer
          : "transparent",
        color: active ? "#fff" : COLORS.outline,
      }}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={{
          color: active ? "#fff" : COLORS.primary,
        }}
      >
        {icon}
      </span>

      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}