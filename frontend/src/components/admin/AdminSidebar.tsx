"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getUser, logout } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: number;
  name?: string;
  email?: string;
  role?: "diner" | "staff" | "admin";
  phone?: string | null;
  restaurant_id?: number | null;
  is_active?: boolean;
}

interface Restaurant {
  id: number;
  name: string;
}

interface AdminSidebarProps {
  className?: string;
}

const PRIMARY = "#01261f";
const PRIMARY_CONTAINER = "#1a3c34";
const PRIMARY_FIXED = "#c5eadf";

const SURFACE = "#fcf9f8";
const SURFACE_LOW = "#f6f3f2";
const SURFACE_CONTAINER = "#f0edec";
const SURFACE_HIGH = "#ebe7e7";

const ON_SURFACE = "#1c1b1b";
const ON_SURFACE_VARIANT = "#414846";
const OUTLINE = "#717976";

const SECONDARY = "#934a2d";
const SECONDARY_CONTAINER = "#ffa17e";

function initials(name?: string) {
  if (!name) return "AD";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(
    null
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const storedUser = getUser() as AdminUser | null;

      if (storedUser) {
        setUser(storedUser);
      }

      const response = await apiFetch<AdminUser>("/auth/me");

      const data =
        response &&
        typeof response === "object" &&
        "data" in response
          ? (response as { data?: AdminUser }).data
          : response;

      if (data) {
        setUser(data);

        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(data));
        }

        if (data.restaurant_id) {
          try {
            const restaurantResponse =
              await apiFetch<Restaurant>(
                `/restaurants/${data.restaurant_id}`
              );

            const restaurantData =
              restaurantResponse &&
              typeof restaurantResponse === "object" &&
              "data" in restaurantResponse
                ? (
                    restaurantResponse as {
                      data?: Restaurant;
                    }
                  ).data
                : restaurantResponse;

            if (restaurantData) {
              setRestaurant(restaurantData);
            }
          } catch {
            // Admin users normally do not have a restaurant assignment.
          }
        }
      }
    } catch {
      const storedUser = getUser() as AdminUser | null;

      if (storedUser) {
        setUser(storedUser);
      }
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch {
      // Continue to login even if API logout fails.
    }

    router.push("/login");
  };

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: "dashboard",
      badge: "live",
      badgeType: "live",
    },
    {
      label: "Restaurants",
      href: "/admin/restaurants",
      icon: "storefront",
      badge: null,
    },
    {
      label: "Reservations",
      href: "/admin/reservations",
      icon: "book_online",
      badge: null,
    },
    {
      label: "Customers",
      href: "/admin/users",
      icon: "group",
      badge: null,
    },
    {
      label: "Staff & Users",
      href: "/admin/restaurant-staff",
      icon: "badge",
      badge: null,
    },
    {
      label: "Approvals",
      href: "/admin/approvals",
      icon: "verified",
      badge: null,
    },
    {
      label: "Reports & Analytics",
      href: "/admin/reports-and-analytics",
      icon: "monitoring",
      badge: null,
    },
    {
      label: "Notifications",
      href: "/admin/notifications",
      icon: "notifications",
      badge: null,
    },
    {
      label: "System Settings",
      href: "/admin/settings",
      icon: "tune",
      badge: null,
    },
  ];

  const sidebar = (
    <aside
      className={[
        "fixed left-0 top-0 h-full w-72 z-50",
        "flex flex-col justify-between",
        "border-r",
        className,
      ].join(" ")}
      style={{
        backgroundColor: "#ffffff",
        borderColor: "rgba(0,0,0,0.04)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* BRAND */}
        <div className="px-6 pt-6 pb-4">
          <Link
            href="/admin"
            className="flex items-center gap-3"
          >
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: PRIMARY,
                color: "#ffffff",
              }}
            >
              <span className="material-symbols-outlined text-[20px]">
                table_restaurant
              </span>
            </div>

            <div className="flex flex-col">
              <span
                className="text-2xl font-bold tracking-tight leading-none"
                style={{
                  fontFamily: "Playfair Display, serif",
                  color: PRIMARY,
                }}
              >
                DINEET
              </span>

              <span
                className="text-[10px] tracking-wider font-semibold uppercase mt-0.5"
                style={{
                  color: SECONDARY,
                }}
              >
                Platform Admin OS
              </span>
            </div>
          </Link>
        </div>

        {/* NODE */}
        <div className="px-6 py-2">
          <div
            className="rounded-xl px-3 py-2 flex items-center justify-between"
            style={{
              backgroundColor: SURFACE_LOW,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full animate-pulse shrink-0"
                style={{
                  backgroundColor: PRIMARY,
                }}
              />

              <span
                className="text-xs font-medium truncate"
                style={{
                  color: ON_SURFACE,
                }}
              >
                Addis Ababa Node
              </span>
            </div>

            <span
              className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{
                color: ON_SURFACE_VARIANT,
                backgroundColor: SURFACE,
              }}
            >
              v2.4 Live
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center justify-between",
                  "px-3 py-2.5 rounded-xl",
                  "font-medium text-sm",
                  "transition-all",
                  active
                    ? "shadow-sm"
                    : "hover:bg-slate-100",
                ].join(" ")}
                style={{
                  backgroundColor: active
                    ? PRIMARY
                    : "transparent",
                  color: active
                    ? "#ffffff"
                    : ON_SURFACE_VARIANT,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{
                      color: active
                        ? "#ffffff"
                        : ON_SURFACE_VARIANT,
                    }}
                  >
                    {item.icon}
                  </span>

                  <span className="truncate">
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{
                      backgroundColor:
                        item.badgeType === "live"
                          ? PRIMARY_FIXED
                          : SURFACE_HIGH,
                      color:
                        item.badgeType === "live"
                          ? PRIMARY
                          : ON_SURFACE,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM */}
      <div
        className="p-4"
        style={{
          backgroundColor: SURFACE_LOW,
        }}
      >
        {/* SYSTEM HEALTH */}
        <div
          className="p-3 rounded-xl mb-3"
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{
                color: ON_SURFACE_VARIANT,
              }}
            >
              System Health
            </span>

            <span
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{
                color: PRIMARY,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: PRIMARY,
                }}
              />

              99.98% API
            </span>
          </div>

          <p
            className="text-[11px]"
            style={{
              color: ON_SURFACE_VARIANT,
            }}
          >
            Telebirr Gateway • CBE Birr Active
          </p>
        </div>

        {/* ADMIN ACCOUNT */}
        <div className="flex items-center gap-3 p-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: PRIMARY,
              color: "#ffffff",
            }}
          >
            <span className="text-sm font-bold">
              {initials(user?.name)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{
                color: ON_SURFACE,
              }}
            >
              {user?.name || "Administrator"}
            </p>

            <p
              className="text-xs truncate font-medium"
              style={{
                color: SECONDARY,
              }}
            >
              {user?.role === "admin"
                ? "Super Administrator"
                : "Platform Administrator"}
            </p>

            {restaurant && (
              <p
                className="text-[10px] truncate"
                style={{
                  color: OUTLINE,
                }}
              >
                {restaurant.name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{
              color: ON_SURFACE_VARIANT,
            }}
            title="Logout / Switch Session"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* MATERIAL SYMBOLS */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");

        .material-symbols-outlined {
          font-family: "Material Symbols Outlined";
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: "liga";
          -webkit-font-smoothing: antialiased;
          font-feature-settings: "liga";
        }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block">
        {sidebar}
      </div>

      {/* MOBILE TOP BUTTON */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
        style={{
          backgroundColor: PRIMARY,
          color: "#ffffff",
        }}
        aria-label="Open admin navigation"
      >
        <span className="material-symbols-outlined text-[22px]">
          menu
        </span>
      </button>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-50 lg:hidden bg-black/30"
          />

          <div className="lg:hidden">
            {sidebar}
          </div>
        </>
      )}
    </>
  );
}