import {Bell, 
  ArrowRight, Award, Badge, BadgeCheck, Bot, Box, Building2,
  CalendarDays, CheckCircle2, Clock3, Coffee, Compass, Flame,
  Grid2X2, Heart, HelpCircle, Image as ImageIcon, Leaf, LoaderCircle, Lock,
  Map, MapPin, Menu, MessageCircle, Music2, QrCode, Search, Sparkles, Star, Table2,
  Utensils, Users, Wifi, X, Zap,
} from "lucide-react";
import { useState } from 'react';

import Link from 'next/link';
type IconName =
  | "table_restaurant" | "location_on" | "notifications" | "arrow_forward"
  | "menu" | "close" | "local_fire_department" | "stars" | "explore"
  | "calendar_today" | "schedule" | "group" | "progress_activity" | "search"
  | "local_cafe" | "deck" | "table_bar" | "eco" | "music_note" | "verified"
  | "grade" | "restaurant_menu" | "restaurant" | "favorite" | "favorite_border"
  | "map" | "grid_view" | "smart_toy" | "contactless" | "qr_code_2" | "domain"
  | "check_circle" | "badge" | "workspace_premium" | "bolt" | "lock"
  | "view_in_ar" | "panorama" | "chat";
const iconMap = {
  table_restaurant: Table2, location_on: MapPin, notifications: Bell,
  arrow_forward: ArrowRight, menu: Menu, close: X,
  local_fire_department: Flame, stars: Sparkles, explore: Compass,
  calendar_today: CalendarDays, schedule: Clock3, group: Users,
  progress_activity: LoaderCircle, search: Search, local_cafe: Coffee,
  deck: Compass, table_bar: Table2, eco: Leaf, music_note: Music2,
  verified: BadgeCheck, grade: Star, restaurant_menu: Utensils, restaurant: Utensils,
  favorite: Heart, favorite_border: Heart, map: Map, grid_view: Grid2X2,
  smart_toy: Bot, contactless: Wifi, qr_code_2: QrCode, chat: MessageCircle, domain: Building2,
  check_circle: CheckCircle2, badge: Badge, workspace_premium: Award, bolt: Zap,
  lock: Lock, view_in_ar: Box, panorama: ImageIcon,
} as const;
function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const Component = iconMap[name] ?? HelpCircle;
  return <Component aria-hidden="true" className={className} strokeWidth={1.9} />;
}

export default function Footer() {
  const year = new Date().getFullYear();
    const [modalOpen, setModalOpen] = useState(false);

    const scrollToRestaurants = () => {
    document
      .getElementById("restaurants")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <>
     {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="bg-[#f0edec] px-5 py-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#01261f] text-[#ffe088]">
                  <Icon name="table_restaurant" className="h-5 w-5" />
                </div>

                <span className="font-serif text-2xl font-bold text-[#01261f]">
                  DINEET
                </span>
              </div>

              <p className="mt-4 font-serif text-xl italic text-[#01261f]">
                Ethiopian Hospitality Reimagined
              </p>

              <p className="mt-3 max-w-md text-sm leading-6 text-[#717976]">
                A modern dining reservation platform connecting guests with
                restaurants across Addis Ababa.
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-[#717976]">
                <span>Payment-ready:</span>

                <span className="rounded bg-[#e5e2e1] px-2 py-1 font-semibold text-[#1c1b1b]">
                  Telebirr
                </span>

                <span className="rounded bg-[#e5e2e1] px-2 py-1 font-semibold text-[#1c1b1b]">
                  CBE Birr
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                For Diners
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <button onClick={scrollToRestaurants} className="text-left hover:text-[#01261f]">
                  Explore Venues
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("technology")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Dining Experiences
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("passport")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Dining Passport
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                For Operators
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <button
                  onClick={() =>
                    document
                      .getElementById("operators")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-left hover:text-[#01261f]"
                >
                  Restaurant Suite
                </button>

                <Link href="/login" className="hover:text-[#01261f]">
                  Operator Portal
                </Link>

                <button
                  onClick={() => setModalOpen(true)}
                  className="text-left hover:text-[#01261f]"
                >
                  Floorplan & Tables
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#01261f]">
                Account
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#717976]">
                <Link href="/login" className="hover:text-[#01261f]">
                  Sign In
                </Link>

                <Link href="/register" className="hover:text-[#01261f]">
                  Create Account
                </Link>

                <Link href="/reservations" className="hover:text-[#01261f]">
                  My Reservations
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#c1c8c4]/40 pt-6 text-xs text-[#717976] md:flex-row">
            <p>© 2026 DINEET Hospitality Technologies.</p>

            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#01261f]" />
                System Operational
              </span>

              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}