"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import FloorTables from "./components/FloorTables";
import StaffSidebar from "./components/StaffSidebar";

type Tab =
| "dashboard"
| "reservations"
| "tables"
| "restaurant"
| "profile";

type ReservationStatus =
| "pending"
| "confirmed"
| "seated"
| "completed"
| "declined"
| "cancelled";

type TableStatus =
| "available"
| "occupied"
| "reserved"
| "maintenance"
| "cleaning"
| string;

interface User {
id: number;
name?: string;
email?: string;
phone?: string | null;
role?: "diner" | "staff" | "admin";
restaurant_id?: number | null;
is_active?: boolean;
}

interface Restaurant {
id: number;
name: string;
description?: string | null;
cuisine_type?: string | null;
price_range?: string | null;
address?: string | null;
city?: string | null;
state?: string | null;
zip?: string | null;
phone?: string | null;
email?: string | null;
hours?: unknown;
photos?: string[] | null;
is_active?: boolean;
approved?: boolean;
}

interface Table {
id: number;
restaurant_id?: number;
table_number?: string | number | null;
capacity: number;
status?: TableStatus | null;
cuisine?: string | null;
approval_status?: string | null;
}

interface Reservation {
id: number;
restaurant_id?: number;
user_id?: number;
table_id?: number | null;
party_size: number;
reservation_date?: string;
reservation_time?: string;
status: ReservationStatus;
notes?: string | null;
special_requests?: string | null;

user?: {
id?: number;
name?: string;
email?: string;
phone?: string | null;
} | null;

restaurant?: {
id?: number;
name?: string;
} | null;

table?: {
id?: number;
table_number?: string | number;
capacity?: number;
status?: string;
} | null;
}

interface NormalizedReservation {
id: number;
restaurantId?: number;
userId?: number;
tableId?: number | null;
party: number;
date: string;
time: string;
status: ReservationStatus;
guest: string;
email: string;
phone: string;
table: string;
notes: string;
specialRequests: string;
}

interface ToastState {
message: string;
type: "success" | "error" | "info";
}

const COLORS = {
primary: "#01261f",
primaryContainer: "#1a3c34",
primaryFixed: "#c5eadf",
primaryFixedDim: "#aacec3",
secondary: "#934a2d",
secondaryFixed: "#ffdbcf",
tertiary: "#735c00",
tertiaryContainer: "#cba72f",
tertiaryFixed: "#ffe088",
surface: "#fcf9f8",
surfaceLow: "#f6f3f2",
surfaceContainer: "#f0edec",
surfaceHigh: "#ebe7e7",
surfaceHighest: "#e5e2e1",
onSurface: "#1c1b1b",
outline: "#717976",
outlineVariant: "#c1c8c4",
error: "#ba1a1a",
};

function unwrapData<T>(payload: any): T {
if (payload?.data !== undefined) {
return payload.data as T;
}

return payload as T;
}

function unwrapCollection<T>(payload: any): T[] {
const data = payload?.data;

if (Array.isArray(data)) {
return data as T[];
}

if (Array.isArray(data?.data)) {
return data.data as T[];
}

if (Array.isArray(payload)) {
return payload as T[];
}

return [];
}

function normalizeReservation(
reservation: Reservation
): NormalizedReservation {
return {
id: reservation.id,
restaurantId: reservation.restaurant_id,
userId: reservation.user_id,
tableId: reservation.table_id,
party: Number(reservation.party_size || 0),
date: reservation.reservation_date || "",
time: reservation.reservation_time || "",
status: reservation.status,
guest:
reservation.user?.name ||
reservation.user?.email ||
`Guest #${reservation.user_id ?? reservation.id}`,
email: reservation.user?.email || "",
phone: reservation.user?.phone || "",
table:
reservation.table?.table_number !== undefined &&
reservation.table?.table_number !== null
? String(reservation.table.table_number)
: reservation.table_id
? `Table ${reservation.table_id}`
: "Unassigned",
notes: reservation.notes || "",
specialRequests: reservation.special_requests || "",
};
}

function formatDate(date: string) {
if (!date) return "—";

try {
return new Intl.DateTimeFormat("en-US", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(`${date}T00:00:00`));
} catch {
return date;
}
}

function formatTime(time: string) {
if (!time) return "—";

const [hourString, minuteString] = time.split(":");
const hour = Number(hourString);

if (Number.isNaN(hour)) return time;

const suffix = hour >= 12 ? "PM" : "AM";
const twelveHour = hour % 12 || 12;

return `${twelveHour}:${minuteString || "00"} ${suffix}`;
}

function initials(name?: string) {
if (!name) return "ST";

return name
.split(/\s+/)
.filter(Boolean)
.slice(0, 2)
.map((part) => part[0])
.join("")
.toUpperCase();
}

function statusClasses(status: string) {
switch (status) {
case "pending":
return "bg-[#ffb59a] text-[#380d00]";


case "confirmed":
  return "bg-[#ffe088] text-[#574500]";

case "seated":
  return "bg-[#c5eadf] text-[#00201a]";

case "completed":
  return "bg-[#e5e2e1] text-[#4b4f4d]";

case "declined":
case "cancelled":
  return "bg-[#ffdad6] text-[#93000a]";

default:
  return "bg-[#f0edec] text-[#1c1b1b]";


}
}

function tableStatusClasses(status?: string | null) {
switch (status) {
case "available":
return "bg-[#c5eadf] text-[#00201a]";


case "occupied":
  return "bg-[#ffdbcf] text-[#380d00]";

case "reserved":
  return "bg-[#ffe088] text-[#574500]";

case "maintenance":
  return "bg-[#ffdad6] text-[#93000a]";

case "cleaning":
  return "bg-[#e5e2e1] text-[#4b4f4d]";

default:
  return "bg-[#f0edec] text-[#1c1b1b]";


}
}

function tableDisplayName(table: Table) {
if (
table.table_number !== undefined &&
table.table_number !== null &&
String(table.table_number).trim() !== ""
) {
return String(table.table_number);
}

return `Table ${table.id}`;
}

function reservationMatchesToday(reservation: NormalizedReservation) {
const today = new Date().toISOString().slice(0, 10);
return reservation.date === today;
}

export default function StaffPage() {
const [activeTab, setActiveTab] = useState<Tab>("dashboard");

const [user, setUser] = useState<User | null>(null);
const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

const [reservations, setReservations] = useState<
NormalizedReservation[]
>([]);

const [tables, setTables] = useState<Table[]>([]);

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const [toast, setToast] = useState<ToastState | null>(null);

const [selectedReservation, setSelectedReservation] =
useState<NormalizedReservation | null>(null);

const [selectedTable, setSelectedTable] = useState<Table | null>(null);

const [showDeclineModal, setShowDeclineModal] = useState(false);
const [declineReservationId, setDeclineReservationId] =
useState<number | null>(null);

const [showWalkInModal, setShowWalkInModal] = useState(false);

const [search, setSearch] = useState("");
const [reservationStatusFilter, setReservationStatusFilter] =
useState("ALL");
const [partyFilter, setPartyFilter] = useState("ALL");
const [dashboardFilter, setDashboardFilter] = useState<
"all" | "pending" | "seated"
>("all");

const [updatingReservationId, setUpdatingReservationId] =
useState<number | null>(null);

const [updatingTableId, setUpdatingTableId] =
useState<number | null>(null);

const [walkInName, setWalkInName] = useState("");
const [walkInParty, setWalkInParty] = useState("2");
const [walkInNotes, setWalkInNotes] = useState("");

const showToast = useCallback(
(message: string, type: ToastState["type"] = "success") => {
setToast({
message,
type,
});


  window.setTimeout(() => {
    setToast(null);
  }, 3500);
},
[]


);

const loadStaffData = useCallback(
async (silent = false) => {
try {
if (silent) {
setRefreshing(true);
} else {
setLoading(true);
}


   let currentUser = getUser() as User | null;


if (!currentUser) {
window.location.href = "/login";
return;
}

if (
currentUser.role !== "staff" &&
currentUser.role !== "admin"
) {
window.location.href = "/";
return;
}

// Get the current authenticated user from Laravel.
// This prevents stale localStorage data from losing restaurant_id.
try {
const meResponse = await apiFetch<User>("/auth/me");

const me = unwrapData<User>(meResponse);

if (me) {
currentUser = me;
localStorage.setItem("user", JSON.stringify(me));
}
} catch (error) {
console.error("Unable to refresh authenticated staff user:", error);
}

setUser(currentUser);

const restaurantId = currentUser.restaurant_id;


    if (!restaurantId && currentUser.role !== "admin") {
      throw new Error(
        "Your staff account is not assigned to a restaurant."
      );
    }

    if (!restaurantId) {
      setReservations([]);
      setTables([]);
      setRestaurant(null);
      return;
    }

    const [
      restaurantResponse,
      reservationsResponse,
      tablesResponse,
    ] = await Promise.all([
      apiFetch(`/restaurants/${restaurantId}`),
      apiFetch(`/restaurants/${restaurantId}/reservations`),
      apiFetch(`/restaurants/${restaurantId}/tables`),
    ]);

    const restaurantData =
      unwrapData<Restaurant>(restaurantResponse);

    const reservationData =
      unwrapCollection<Reservation>(reservationsResponse);

    const tableData = unwrapCollection<Table>(tablesResponse);

    setRestaurant(restaurantData);
    setReservations(reservationData.map(normalizeReservation));
    setTables(tableData);
  } catch (error) {
    console.error("Staff dashboard loading error:", error);

    showToast(
      error instanceof Error
        ? error.message
        : "Unable to load staff operations data.",
      "error"
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
},
[showToast]


);

useEffect(() => {
loadStaffData();
}, [loadStaffData]);

const todayReservations = useMemo(
() => reservations.filter(reservationMatchesToday),
[reservations]
);

const pendingCount = useMemo(
() =>
todayReservations.filter(
(reservation) => reservation.status === "pending"
).length,
[todayReservations]
);

const confirmedCount = useMemo(
() =>
todayReservations.filter(
(reservation) => reservation.status === "confirmed"
).length,
[todayReservations]
);

const seatedCount = useMemo(
() =>
todayReservations.filter(
(reservation) => reservation.status === "seated"
).length,
[todayReservations]
);

const completedCount = useMemo(
() =>
todayReservations.filter(
(reservation) => reservation.status === "completed"
).length,
[todayReservations]
);

const availableTableCount = useMemo(
() =>
tables.filter((table) => table.status === "available").length,
[tables]
);

const occupiedTableCount = useMemo(
() =>
tables.filter((table) => table.status === "occupied").length,
[tables]
);

const reservedTableCount = useMemo(
() =>
tables.filter((table) => table.status === "reserved").length,
[tables]
);

const filteredReservations = useMemo(() => {
const query = search.trim().toLowerCase();


return reservations
  .filter((reservation) => {
    if (
      reservationStatusFilter !== "ALL" &&
      reservation.status !== reservationStatusFilter
    ) {
      return false;
    }

    if (partyFilter !== "ALL") {
      if (partyFilter === "1-2") {
        if (reservation.party < 1 || reservation.party > 2) {
          return false;
        }
      }

      if (partyFilter === "3-5") {
        if (reservation.party < 3 || reservation.party > 5) {
          return false;
        }
      }

      if (partyFilter === "6+") {
        if (reservation.party < 6) {
          return false;
        }
      }
    }

    if (!query) return true;

    const searchable = [
      reservation.guest,
      reservation.email,
      reservation.phone,
      reservation.table,
      reservation.notes,
      reservation.specialRequests,
      String(reservation.id),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  })
  .sort((a, b) => {
    const aValue = `${a.date} ${a.time}`;
    const bValue = `${b.date} ${b.time}`;

    return aValue.localeCompare(bValue);
  });


}, [
reservations,
search,
reservationStatusFilter,
partyFilter,
]);

const dashboardReservations = useMemo(() => {
return todayReservations
.filter((reservation) => {
if (dashboardFilter === "all") return true;


    return reservation.status === dashboardFilter;
  })
  .sort((a, b) => {
    return `${a.date}${a.time}`.localeCompare(
      `${b.date}${b.time}`
    );
  });


}, [todayReservations, dashboardFilter]);

const nextArrival = useMemo(() => {
const pendingOrConfirmed = todayReservations
.filter(
(reservation) =>
reservation.status === "pending" ||
reservation.status === "confirmed"
)
.sort((a, b) => a.time.localeCompare(b.time));


return pendingOrConfirmed[0] || null;


}, [todayReservations]);

const occupancyPercent =
tables.length > 0
? Math.round(
((occupiedTableCount + reservedTableCount) /
tables.length) *
100
)
: 0;

const handleTabChange = (tab: Tab) => {
setActiveTab(tab);
};

const updateReservationStatus = async (
id: number,
status: ReservationStatus
) => {
try {
setUpdatingReservationId(id);


  await apiFetch(`/reservations/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      status,
    }),
  });

  setReservations((current) =>
    current.map((reservation) =>
      reservation.id === id
        ? {
            ...reservation,
            status,
          }
        : reservation
    )
  );

  setSelectedReservation((current) =>
    current?.id === id
      ? {
          ...current,
          status,
        }
      : current
  );

  const reservation = reservations.find(
    (item) => item.id === id
  );

  const statusText =
    status === "confirmed"
      ? "confirmed"
      : status === "seated"
        ? "marked as seated"
        : status === "completed"
          ? "completed"
          : status === "declined"
            ? "declined"
            : status;

  showToast(
    reservation
      ? `${reservation.guest} ${statusText}.`
      : `Reservation ${statusText}.`,
    status === "declined" ? "info" : "success"
  );
} catch (error) {
  console.error(error);

  showToast(
    error instanceof Error
      ? error.message
      : "Unable to update reservation status.",
    "error"
  );
} finally {
  setUpdatingReservationId(null);
}


};

const confirmReservation = async (id: number) => {
await updateReservationStatus(id, "confirmed");
};

const seatGuest = async (id: number) => {
await updateReservationStatus(id, "seated");
};

const completeReservation = async (id: number) => {
await updateReservationStatus(id, "completed");
};

const declineReservation = async () => {
if (!declineReservationId) return;


await updateReservationStatus(
  declineReservationId,
  "declined"
);

setShowDeclineModal(false);
setDeclineReservationId(null);


};

const updateTableStatus = async (
table: Table,
status: TableStatus
) => {
try {
setUpdatingTableId(table.id);


  const restaurantId =
    restaurant?.id || user?.restaurant_id;

  if (!restaurantId) {
    throw new Error("Restaurant assignment not found.");
  }

  await apiFetch(
    `/restaurants/${restaurantId}/tables/${table.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );

  setTables((current) =>
    current.map((item) =>
      item.id === table.id
        ? {
            ...item,
            status,
          }
        : item
    )
  );

  setSelectedTable((current) =>
    current?.id === table.id
      ? {
          ...current,
          status,
        }
      : current
  );

  showToast(
    `${tableDisplayName(table)} is now ${status}.`
  );
} catch (error) {
  console.error(error);

  showToast(
    error instanceof Error
      ? error.message
      : "Unable to update table status.",
    "error"
  );
} finally {
  setUpdatingTableId(null);
}


};

const resetFilters = () => {
setSearch("");
setReservationStatusFilter("ALL");
setPartyFilter("ALL");
};

const printManifest = () => {
window.print();
};

const shareRestaurantLocation = async () => {
const address = [
restaurant?.address,
restaurant?.city,
restaurant?.state,
restaurant?.zip,
]
.filter(Boolean)
.join(", ");


if (!address) {
  showToast(
    "No restaurant address is available.",
    "error"
  );
  return;
}

try {
  if (navigator.share) {
    await navigator.share({
      title: restaurant?.name || "Restaurant",
      text: address,
    });
  } else {
    await navigator.clipboard.writeText(address);
    showToast("Restaurant address copied.");
  }
} catch {
  // User cancelled native share.
}


};

const handleWalkInSubmit = async (
event: React.FormEvent<HTMLFormElement>
) => {
event.preventDefault();


/*
 * The current Laravel API does not expose a dedicated
 * staff walk-in endpoint. We therefore intentionally do
 * not create fake client-side reservations here.
 */
showToast(
  "Walk-in creation needs a dedicated Laravel reservation endpoint. No fake booking was created.",
  "info"
);

setShowWalkInModal(false);


};

const logoutStaff = async () => {
try {
await logout();
} catch {
// Continue to login even if the API logout request fails.
}


window.location.href = "/login";


};

if (loading) {
return (
<div
className="min-h-screen flex items-center justify-center"
style={{
backgroundColor: COLORS.surface,
color: COLORS.onSurface,
}}
>
<div className="flex flex-col items-center gap-4">
<div
className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
style={{
borderColor: COLORS.primaryFixed,
borderTopColor: COLORS.primary,
}}
/>


      <div className="text-sm font-semibold">
        Loading staff operations…
      </div>

      <div className="text-xs opacity-60">
        Connecting to Laravel API
      </div>
    </div>
  </div>
);


}

const displayName = user?.name || "Staff Member";
const restaurantName =
restaurant?.name || "Assigned Restaurant";

return (
<div
className="min-h-screen"
style={{
backgroundColor: COLORS.surface,
color: COLORS.onSurface,
}}
>
<style jsx global>{`
@import url("[https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined\:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200](https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined\:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200)");
@import url("[https://fonts.googleapis.com/css2?family=Playfair+Display\:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans\:wght@400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Playfair+Display\:ital,wght@0,600;0,700;1,600\&family=Plus+Jakarta+Sans\:wght@400;500;600;700\&display=swap)");


    html, 
    body { 
      margin: 0; 
      padding: 0; 
      background: ${COLORS.surface}; 
    } 

    body { 
      font-family: "Plus Jakarta Sans", sans-serif; 
    } 

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

    .staff-headline { 
      font-family: "Playfair Display", serif; 
    } 

    @media print { 
      aside, 
      header, 
      .no-print { 
        display: none !important; 
      } 

      main { 
        margin-left: 0 !important; 
        padding-top: 0 !important; 
      } 
    } 
  `}</style> 

        <StaffSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        restaurantName={restaurantName}
        displayName={displayName}
      />

{/* ========================================================= 
      MAIN 
  \========================================================= */} 

  <div className="lg\:pl-50"> 
    {/* TOP HEADER */} 

    <header 
      className="fixed top-0 left-0 lg\:left-64 right-0 h-16 z-40 flex items-center justify-between px-5 lg\:px-6 backdrop-blur-xl border-b" 
      style={{ 
        backgroundColor: "rgba(252,249,248,0.86)", 
        borderColor: "rgba(0,0,0,0.04)", 
      }} 
    > 
      <div className="flex items-center gap-4"> 
        <div 
          className="hidden sm\:flex items-center gap-2 px-3 py-2 rounded-full shadow-sm" 
          style={{ 
            backgroundColor: "#fff", 
          }} 
        > 
          <span 
            className="h-2.5 w-2.5 rounded-full" 
            style={{ 
              backgroundColor: COLORS.primary, 
            }} 
          /> 

          <span className="text-[11px] font-semibold"> 
            Dining Room {occupancyPercent}% Occupancy 
          </span> 
        </div> 

        <div 
          className="hidden xl\:flex items-center gap-2 text-[11px]" 
          style={{ color: COLORS.outline }} 
        > 
          <span 
            className="material-symbols-outlined text-[16px]" 
            style={{ color: COLORS.tertiary }} 
          > 
            restaurant_menu 
          </span> 

          <span>{tables.length} Active Tables</span> 

          <span>•</span> 

          <span 
            className="material-symbols-outlined text-[16px]" 
            style={{ color: COLORS.secondary }} 
          > 
            timelapse 
          </span> 

          <span>{pendingCount} Pending</span> 
        </div> 
      </div> 

      <div className="flex items-center gap-3"> 
        <button 
          type="button" 
          onClick={() => setShowWalkInModal(true)} 
          className="h-9 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm transition-all hover\:opacity-90" 
          style={{ 
            backgroundColor: COLORS.primary, 
            color: "#fff", 
          }} 
        > 
          <span className="material-symbols-outlined text-[18px]"> 
            add 
          </span> 

          <span className="hidden sm\:inline"> 
            Quick Walk-in 
          </span> 
        </button> 

        <button 
          type="button" 
          onClick={() => loadStaffData(true)} 
          disabled={refreshing} 
          aria-label="Refresh" 
          className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm transition-all hover\:opacity-80" 
          style={{ 
            backgroundColor: "#fff", 
            color: COLORS.outline, 
          }} 
        > 
          <span 
            className={`material-symbols-outlined text-[20px] ${ 
              refreshing ? "animate-spin" : "" 
            }`} 
          > 
            refresh 
          </span> 
        </button> 

        <div 
          className="hidden sm\:block h-8 w-px" 
          style={{ 
            backgroundColor: COLORS.surfaceHighest, 
          }} 
        /> 

        <div className="flex items-center gap-2"> 
          <div className="hidden md\:flex flex-col text-right"> 
            <span 
              className="text-xs font-semibold leading-tight" 
              style={{ color: COLORS.onSurface }} 
            > 
              {displayName} 
            </span> 

            <span 
              className="text-[10px] font-medium" 
              style={{ color: COLORS.secondary }} 
            > 
              {user?.role === "admin" 
                ? "Administrator" 
                : "Restaurant Staff"} 
            </span> 
          </div> 

          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center" 
            style={{ 
              backgroundColor: COLORS.primary, 
              color: "#fff", 
            }} 
          > 
            <span className="text-xs font-bold"> 
              {initials(displayName)} 
            </span> 
          </div> 
        </div> 
      </div> 
    </header> 

    <main className="pt-16 min-h-screen"> 
      {/* ===================================================== 
          LIVE STRIP + TABS 
      \===================================================== */} 

      <div 
        className="w-full px-5 lg\:px-16 py-2 flex flex-col xl\:flex-row items-start xl\:items-center justify-between gap-3" 
        style={{ 
          backgroundColor: "#fff", 
          boxShadow: "0 1px 5px rgba(0,0,0,0.03)", 
        }} 
      > 
        <div className="flex items-center gap-3 flex-wrap"> 
          <div className="flex items-center gap-2"> 
            <span 
              className="w-2.5 h-2.5 rounded-full ring-4" 
              style={{ 
                backgroundColor: COLORS.primary, 
                boxShadow: `0 0 0 4px ${COLORS.primaryFixed}`, 
              }} 
            /> 

            <span 
              className="text-xs font-bold" 
              style={{ color: COLORS.primary }} 
            > 
              {restaurantName} 
            </span> 

            <span style={{ color: COLORS.outlineVariant }}> 
              • 
            </span> 

            <span 
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded" 
              style={{ 
                backgroundColor: COLORS.surfaceContainer, 
                color: COLORS.secondary, 
              }} 
            > 
              {restaurant?.city || "Restaurant"} 
            </span> 
          </div> 

          <div 
            className="hidden lg\:flex items-center gap-2 text-[10px]" 
            style={{ color: COLORS.outline }} 
          > 
            <span 
              className="material-symbols-outlined text-[15px]" 
              style={{ color: COLORS.tertiary }} 
            > 
              cloud_done 
            </span> 

            <span> 
              Laravel API Connected • {reservations.length} bookings 
              synced 
            </span> 
          </div> 
        </div> 

        <nav 
          className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto max-w-full" 
          style={{ 
            backgroundColor: COLORS.surfaceLow, 
          }} 
        > 
          <TopTabButton 
            active={activeTab === "dashboard"} 
            icon="space_dashboard" 
            label="Overview" 
            onClick={() => setActiveTab("dashboard")} 
          /> 

          <TopTabButton 
            active={activeTab === "reservations"} 
            icon="book_online" 
            label="Reservations" 
            badge={pendingCount} 
            onClick={() => setActiveTab("reservations")} 
          /> 

          <TopTabButton 
            active={activeTab === "tables"} 
            icon="table_restaurant" 
            label="Floor & Tables" 
            onClick={() => setActiveTab("tables")} 
          /> 

          <TopTabButton 
            active={activeTab === "restaurant"} 
            icon="storefront" 
            label="Venue Specs" 
            onClick={() => setActiveTab("restaurant")} 
          /> 

          <TopTabButton 
            active={activeTab === "profile"} 
            icon="badge" 
            label="Session & API" 
            onClick={() => setActiveTab("profile")} 
          /> 
        </nav> 
      </div> 

      {/* LIVE TICKER */} 

      <div 
        className="w-full px-5 lg\:px-16 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]" 
        style={{ 
          backgroundColor: COLORS.primaryContainer, 
          color: "#fff", 
        }} 
      > 
        <div className="flex items-center gap-2 min-w-0"> 
          <span 
            className="material-symbols-outlined text-[15px] animate-spin" 
            style={{ color: COLORS.tertiaryFixed }} 
          > 
            update 
          </span> 

          <span 
            className="font-bold uppercase tracking-wider" 
            style={{ color: COLORS.primaryFixed }} 
          > 
            Live Pacing: 
          </span> 

          <span className="truncate font-medium"> 
            {nextArrival 
              ? `${nextArrival.guest} (${nextArrival.party} Pax) — ${formatTime( 
                  nextArrival.time 
                )} • ${nextArrival.specialRequests || "Standard service"}` 
              : "No upcoming pending or confirmed arrival today."} 
          </span> 
        </div> 

        <div className="flex items-center gap-4"> 
          <span className="flex items-center gap-1"> 
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ 
                backgroundColor: COLORS.tertiaryFixed, 
              }} 
            /> 

            {availableTableCount}/{tables.length} Tables Free 
          </span> 

          <span>•</span> 

          <span className="flex items-center gap-1"> 
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ 
                backgroundColor: COLORS.secondaryFixed, 
              }} 
            /> 

            {todayReservations.reduce( 
              (sum, item) => sum + item.party, 
              0 
            )}{" "} 
            covers today 
          </span> 

          <button 
            type="button" 
            onClick={() => setActiveTab("profile")} 
            className="underline font-semibold" 
            style={{ 
              color: COLORS.tertiaryFixed, 
            }} 
          > 
            Inspect Laravel API 
          </button> 
        </div> 
      </div> 

      {/* ===================================================== 
          CONTENT 
      \===================================================== */} 

      <div className="w-full px-5 lg\:px-16 py-6"> 
        {activeTab === "dashboard" && ( 
          <DashboardTab 
            displayName={displayName} 
            restaurantName={restaurantName} 
            todayReservations={todayReservations} 
            dashboardReservations={dashboardReservations} 
            pendingCount={pendingCount} 
            confirmedCount={confirmedCount} 
            seatedCount={seatedCount} 
            completedCount={completedCount} 
            availableTableCount={availableTableCount} 
            tablesTotal={tables.length} 
            dashboardFilter={dashboardFilter} 
            setDashboardFilter={setDashboardFilter} 
            onWalkIn={() => setShowWalkInModal(true)} 
            onFloor={() => setActiveTab("tables")} 
            onPrint={printManifest} 
            onOpenReservation={(reservation) => 
              setSelectedReservation(reservation) 
            } 
            onConfirm={confirmReservation} 
            onDecline={(id) => { 
              setDeclineReservationId(id); 
              setShowDeclineModal(true); 
            }} 
            onSeat={seatGuest} 
            onComplete={completeReservation} 
            updatingReservationId={updatingReservationId} 
          /> 
        )} 

        {activeTab === "reservations" && ( 
          <ReservationsTab 
            restaurantName={restaurantName} 
            reservations={filteredReservations} 
            allReservations={reservations} 
            search={search} 
            setSearch={setSearch} 
            statusFilter={reservationStatusFilter} 
            setStatusFilter={setReservationStatusFilter} 
            partyFilter={partyFilter} 
            setPartyFilter={setPartyFilter} 
            resetFilters={resetFilters} 
            onOpenReservation={(reservation) => 
              setSelectedReservation(reservation) 
            } 
            onConfirm={confirmReservation} 
            onDecline={(id) => { 
              setDeclineReservationId(id); 
              setShowDeclineModal(true); 
            }} 
            onSeat={seatGuest} 
            onComplete={completeReservation} 
            updatingReservationId={updatingReservationId} 
          /> 
        )} 

        {activeTab === "tables" && ( 


<FloorTables />
)}


        {activeTab === "restaurant" && ( 
          <RestaurantTab 
            restaurant={restaurant} 
            tables={tables} 
            reservations={todayReservations} 
            onShareLocation={shareRestaurantLocation} 
          /> 
        )} 

        {activeTab === "profile" && ( 
          <ProfileTab 
            user={user} 
            restaurant={restaurant} 
            onRefresh={() => loadStaffData(true)} 
            onLogout={logoutStaff} 
          /> 
        )} 
      </div> 
    </main> 
  </div> 

  {/* ========================================================= 
      RESERVATION DRAWER 
  \========================================================= */} 

  {selectedReservation && ( 
    <ReservationDrawer 
      reservation={selectedReservation} 
      onClose={() => setSelectedReservation(null)} 
      onConfirm={confirmReservation} 
      onDecline={(id) => { 
        setSelectedReservation(null); 
        setDeclineReservationId(id); 
        setShowDeclineModal(true); 
      }} 
      onSeat={seatGuest} 
      onComplete={completeReservation} 
      updatingReservationId={updatingReservationId} 
    /> 
  )} 

  {/* ========================================================= 
      TABLE DRAWER 
  \========================================================= */} 

  {selectedTable && ( 
    <TableDrawer 
      table={selectedTable} 
      restaurantName={restaurantName} 
      onClose={() => setSelectedTable(null)} 
      onUpdateStatus={updateTableStatus} 
      updating={updatingTableId === selectedTable.id} 
    /> 
  )} 

  {/* ========================================================= 
      DECLINE MODAL 
  \========================================================= */} 

  {showDeclineModal && ( 
    <Modal 
      title="Decline Reservation" 
      subtitle="This will update the reservation status in Laravel." 
      onClose={() => { 
        setShowDeclineModal(false); 
        setDeclineReservationId(null); 
      }} 
    > 
      <div className="space-y-4"> 
        <div 
          className="p-3 rounded-lg text-xs" 
          style={{ 
            backgroundColor: "#ffdad6", 
            color: "#93000a", 
          }} 
        > 
          The current reservation API accepts the reservation status. 
          The decline reason selector from the original static design 
          is therefore not sent to the backend unless the Laravel API 
          is later extended to store one. 
        </div> 

        <div className="flex gap-2"> 
          <button 
            type="button" 
            onClick={() => { 
              setShowDeclineModal(false); 
              setDeclineReservationId(null); 
            }} 
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold" 
            style={{ 
              backgroundColor: COLORS.surfaceContainer, 
            }} 
          > 
            Cancel 
          </button> 

          <button 
            type="button" 
            onClick={declineReservation} 
            disabled={ 
              declineReservationId !== null && 
              updatingReservationId === declineReservationId 
            } 
            className="flex-1 py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
            style={{ 
              backgroundColor: COLORS.error, 
              color: "#fff", 
            }} 
          > 
            {declineReservationId !== null && 
            updatingReservationId === declineReservationId 
              ? "Declining…" 
              : "Decline Booking"} 
          </button> 
        </div> 
      </div> 
    </Modal> 
  )} 

  {/* ========================================================= 
      WALK-IN MODAL 
  \========================================================= */} 

  {showWalkInModal && ( 
    <Modal 
      title="Quick Walk-in Seating" 
      subtitle="Staff walk-in creation requires a backend reservation endpoint." 
      onClose={() => setShowWalkInModal(false)} 
    > 
      <form onSubmit={handleWalkInSubmit} className="space-y-4"> 
        <div> 
          <label className="block text-[11px] font-semibold mb-1"> 
            Guest Name 
          </label> 

          <input 
            value={walkInName} 
            onChange={(event) => 
              setWalkInName(event.target.value) 
            } 
            className="w-full px-3 py-2 rounded-lg outline-none text-sm" 
            style={{ 
              backgroundColor: COLORS.surfaceLow, 
            }} 
            placeholder="Guest name" 
          /> 
        </div> 

        <div> 
          <label className="block text-[11px] font-semibold mb-1"> 
            Party Size 
          </label> 

          <input 
            type="number" 
            min={1} 
            max={20} 
            value={walkInParty} 
            onChange={(event) => 
              setWalkInParty(event.target.value) 
            } 
            className="w-full px-3 py-2 rounded-lg outline-none text-sm" 
            style={{ 
              backgroundColor: COLORS.surfaceLow, 
            }} 
          /> 
        </div> 

        <div> 
          <label className="block text-[11px] font-semibold mb-1"> 
            Notes 
          </label> 

          <textarea 
            value={walkInNotes} 
            onChange={(event) => 
              setWalkInNotes(event.target.value) 
            } 
            rows={3} 
            className="w-full px-3 py-2 rounded-lg outline-none text-sm resize-none" 
            style={{ 
              backgroundColor: COLORS.surfaceLow, 
            }} 
            placeholder="Service notes" 
          /> 
        </div> 

        <div 
          className="p-3 rounded-lg text-xs" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
            color: COLORS.outline, 
          }} 
        > 
          The original HTML created a fake reservation entirely in 
          browser memory. This React version intentionally does not do 
          that. Once we add a staff/manual-reservation endpoint to 
          Laravel, this form can create the real booking. 
        </div> 

        <div className="flex justify-end gap-2"> 
          <button 
            type="button" 
            onClick={() => setShowWalkInModal(false)} 
            className="px-4 py-2 rounded-lg text-xs font-semibold" 
            style={{ 
              backgroundColor: COLORS.surfaceContainer, 
            }} 
          > 
            Close 
          </button> 

          <button 
            type="submit" 
            className="px-4 py-2 rounded-lg text-xs font-bold" 
            style={{ 
              backgroundColor: COLORS.primary, 
              color: "#fff", 
            }} 
          > 
            Continue 
          </button> 
        </div> 
      </form> 
    </Modal> 
  )} 

  {/* ========================================================= 
      TOAST 
  \========================================================= */} 

  {toast && ( 
    <div 
      className="fixed bottom-6 right-6 z-[100] max-w-sm flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl" 
      style={{ 
        backgroundColor: 
          toast.type === "error" 
            ? COLORS.error 
            : COLORS.primary, 
        color: "#fff", 
      }} 
    > 
      <span className="material-symbols-outlined text-[20px]"> 
        {toast.type === "error" 
          ? "error" 
          : toast.type === "info" 
            ? "info" 
            : "check_circle"} 
      </span> 

      <span className="text-xs font-semibold"> 
        {toast.message} 
      </span> 
    </div> 
  )} 
</div> 


);
}

/* =====================================================================
SIDEBAR BUTTON
\===================================================================== */

/* =====================================================================
TOP TAB
\===================================================================== */

function TopTabButton({
active,
icon,
label,
badge,
onClick,
}: {
active: boolean;
icon: string;
label: string;
badge?: number;
onClick: () => void;
}) {
return (
<button
type="button"
onClick={onClick}
className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition-all"
style={{
backgroundColor: active
? COLORS.primary
: "transparent",
color: active ? "#fff" : COLORS.outline,
boxShadow: active
? "0 1px 3px rgba(0,0,0,0.12)"
: "none",
}}
>
<span className="material-symbols-outlined text-[18px]">
{icon}
</span>


  <span>{label}</span> 

  {badge !== undefined && badge > 0 && ( 
    <span 
      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" 
      style={{ 
        backgroundColor: COLORS.secondary, 
        color: "#fff", 
      }} 
    > 
      {badge} 
    </span> 
  )} 
</button> 


);
}

/* =====================================================================
DASHBOARD
\===================================================================== */

function DashboardTab({
displayName,
restaurantName,
todayReservations,
dashboardReservations,
pendingCount,
confirmedCount,
seatedCount,
completedCount,
availableTableCount,
tablesTotal,
dashboardFilter,
setDashboardFilter,
onWalkIn,
onFloor,
onPrint,
onOpenReservation,
onConfirm,
onDecline,
onSeat,
onComplete,
updatingReservationId,
}: {
displayName: string;
restaurantName: string;
todayReservations: NormalizedReservation[];
dashboardReservations: NormalizedReservation[];
pendingCount: number;
confirmedCount: number;
seatedCount: number;
completedCount: number;
availableTableCount: number;
tablesTotal: number;
dashboardFilter: "all" | "pending" | "seated";
setDashboardFilter: (
filter: "all" | "pending" | "seated"
) => void;
onWalkIn: () => void;
onFloor: () => void;
onPrint: () => void;
onOpenReservation: (
reservation: NormalizedReservation
) => void;
onConfirm: (id: number) => void;
onDecline: (id: number) => void;
onSeat: (id: number) => void;
onComplete: (id: number) => void;
updatingReservationId: number | null;
}) {
const total = todayReservations.length;

return (
<section className="flex flex-col gap-6">
<div className="flex flex-col md\:flex-row md\:items-end justify-between gap-4">
<div>
<span
className="text-[10px] uppercase tracking-[0.18em] font-bold"
style={{ color: COLORS.secondary }}
>
Restaurant Operations Hub
</span>


      <h1 
        className="staff-headline text-3xl font-semibold tracking-tight mt-1" 
        style={{ color: COLORS.primary }} 
      > 
        Good evening, {displayName} 
      </h1> 

      <p 
        className="text-sm mt-1" 
        style={{ color: COLORS.outline }} 
      > 
        {restaurantName} service dashboard connected to the live 
        Laravel reservation system. 
      </p> 
    </div> 

    <div className="flex items-center gap-2 flex-wrap"> 
      <button 
        type="button" 
        onClick={onWalkIn} 
        className="h-10 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-sm" 
        style={{ 
          backgroundColor: COLORS.primary, 
          color: "#fff", 
        }} 
      > 
        <span className="material-symbols-outlined text-[20px]"> 
          person_add 
        </span> 

        <span>Quick Walk-in Seating</span> 
      </button> 

      <button 
        type="button" 
        onClick={onFloor} 
        className="h-10 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold" 
        style={{ 
          backgroundColor: COLORS.surfaceContainer, 
          color: COLORS.onSurface, 
        }} 
      > 
        <span className="material-symbols-outlined text-[20px]"> 
          view_quilt 
        </span> 

        <span>Floor View</span> 
      </button> 

      <button 
        type="button" 
        onClick={onPrint} 
        className="h-10 w-10 rounded-lg flex items-center justify-center shadow-sm" 
        style={{ 
          backgroundColor: "#fff", 
          color: COLORS.outline, 
        }} 
      > 
        <span className="material-symbols-outlined text-[20px]"> 
          print 
        </span> 
      </button> 
    </div> 
  </div> 

  {/* KPI */} 

  <div className="grid grid-cols-1 sm\:grid-cols-2 xl\:grid-cols-4 gap-5"> 
    <KpiCard 
      title="Today's Bookings" 
      value={total} 
      icon="calendar_today" 
      accent="primary" 
      footer={`${todayReservations.reduce( 
        (sum, reservation) => sum + reservation.party, 
        0 
      )} covers scheduled`} 
      percent={Math.min(100, total * 5)} 
    /> 

    <KpiCard 
      title="Confirmed Covers" 
      value={confirmedCount} 
      icon="how_to_reg" 
      accent="tertiary" 
      footer={`${seatedCount} currently seated`} 
      percent={ 
        total > 0 
          ? Math.round((confirmedCount / total) * 100) 
          : 0 
      } 
    /> 

    <KpiCard 
      title="Pending Review" 
      value={pendingCount} 
      icon="pending_actions" 
      accent="secondary" 
      footer={ 
        pendingCount > 0 
          ? "Requires host seating allocation" 
          : "No pending reviews" 
      } 
      percent={ 
        total > 0 
          ? Math.round((pendingCount / total) * 100) 
          : 0 
      } 
    /> 

    <KpiCard 
      title="Free Tables" 
      value={ 
        <span> 
          {availableTableCount}{" "} 
          <span 
            className="text-sm font-normal" 
            style={{ color: COLORS.outline }} 
          > 
            / {tablesTotal} 
          </span> 
        </span> 
      } 
      icon="table_bar" 
      accent="primary" 
      footer={`${seatedCount} reservations currently seated`} 
      percent={ 
        tablesTotal > 0 
          ? Math.round( 
              (availableTableCount / tablesTotal) * 100 
            ) 
          : 0 
      } 
    /> 
  </div> 

  {/* BALANCE STRIP */} 

  <div 
    className="rounded-xl p-4 flex flex-col lg\:flex-row items-center justify-between gap-3 shadow-sm" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div className="flex items-center gap-4 flex-wrap"> 
      <span 
        className="material-symbols-outlined" 
        style={{ color: COLORS.primary }} 
      > 
        pie_chart 
      </span> 

      <span className="text-xs font-bold"> 
        Live Floor Balance: 
      </span> 

      <span className="flex items-center gap-1 text-[11px]"> 
        <span 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: COLORS.primary }} 
        /> 
        {seatedCount} Seated 
      </span> 

      <span className="flex items-center gap-1 text-[11px]"> 
        <span 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: COLORS.secondary }} 
        /> 
        {confirmedCount} Confirmed 
      </span> 

      <span className="flex items-center gap-1 text-[11px]"> 
        <span 
          className="w-3 h-3 rounded-full" 
          style={{ 
            backgroundColor: COLORS.surfaceHighest, 
          }} 
        /> 
        {availableTableCount} Available 
      </span> 
    </div> 

    <button 
      type="button" 
      onClick={onFloor} 
      className="text-xs font-bold flex items-center gap-1" 
      style={{ color: COLORS.primary }} 
    > 
      Open Interactive Floor Map 

      <span className="material-symbols-outlined text-[14px]"> 
        arrow_forward 
      </span> 
    </button> 
  </div> 

  {/* MANIFEST */} 

  <div 
    className="rounded-xl overflow-hidden shadow-sm" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div 
      className="px-5 py-4 flex flex-col sm\:flex-row items-start sm\:items-center justify-between gap-3" 
      style={{ 
        backgroundColor: COLORS.surfaceLow, 
      }} 
    > 
      <div> 
        <h2 
          className="staff-headline text-xl font-semibold" 
          style={{ color: COLORS.primary }} 
        > 
          Today&apos;s Dinner Service Manifest 
        </h2> 

        <p 
          className="text-[11px] mt-1" 
          style={{ color: COLORS.outline }} 
        > 
          Live operational bookings ordered chronologically. 
        </p> 
      </div> 

      <div className="flex items-center gap-1"> 
        <FilterPill 
          active={dashboardFilter === "all"} 
          label={`All (${total})`} 
          onClick={() => setDashboardFilter("all")} 
        /> 

        <FilterPill 
          active={dashboardFilter === "pending"} 
          label={`Pending (${pendingCount})`} 
          onClick={() => setDashboardFilter("pending")} 
        /> 

        <FilterPill 
          active={dashboardFilter === "seated"} 
          label={`Seated (${seatedCount})`} 
          onClick={() => setDashboardFilter("seated")} 
        /> 
      </div> 
    </div> 

    <ReservationTable 
      reservations={dashboardReservations} 
      compact 
      onOpen={onOpenReservation} 
      onConfirm={onConfirm} 
      onDecline={onDecline} 
      onSeat={onSeat} 
      onComplete={onComplete} 
      updatingReservationId={updatingReservationId} 
    /> 
  </div> 

  {completedCount > 0 && ( 
    <div 
      className="text-[11px] px-4 py-3 rounded-lg" 
      style={{ 
        backgroundColor: COLORS.surfaceContainer, 
        color: COLORS.outline, 
      }} 
    > 
      {completedCount} reservation 
      {completedCount === 1 ? "" : "s"} completed today. 
    </div> 
  )} 
</section> 


);
}

/* =====================================================================
KPI
\===================================================================== */

function KpiCard({
title,
value,
icon,
accent,
footer,
percent,
}: {
title: string;
value: React.ReactNode;
icon: string;
accent: "primary" | "secondary" | "tertiary";
footer: string;
percent: number;
}) {
const color =
accent === "secondary"
? COLORS.secondary
: accent === "tertiary"
? COLORS.tertiary
: COLORS.primary;

return (
<div
className="p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden"
style={{
backgroundColor: "#fff",
}}
>
<div
className="absolute -right-4 -top-4 w-20 h-20 rounded-full"
style={{
backgroundColor:
accent === "secondary"
? "rgba(147,74,45,0.08)"
: accent === "tertiary"
? "rgba(115,92,0,0.08)"
: "rgba(1,38,31,0.05)",
}}
/>


  <div className="flex items-center justify-between relative"> 
    <span 
      className="text-[10px] uppercase tracking-wider font-semibold" 
      style={{ color: COLORS.outline }} 
    > 
      {title} 
    </span> 

    <span 
      className="material-symbols-outlined text-[20px]" 
      style={{ color }} 
    > 
      {icon} 
    </span> 
  </div> 

  <div className="my-4 relative"> 
    <div 
      className="staff-headline text-3xl font-bold" 
      style={{ color }} 
    > 
      {value} 
    </div> 

    <div 
      className="text-[10px] mt-1 font-medium" 
      style={{ color }} 
    > 
      {footer} 
    </div> 
  </div> 

  <div 
    className="w-full h-1.5 rounded-full overflow-hidden" 
    style={{ 
      backgroundColor: COLORS.surfaceHighest, 
    }} 
  > 
    <div 
      className="h-full rounded-full" 
      style={{ 
        backgroundColor: color, 
        width: `${Math.max(0, Math.min(100, percent))}%`, 
      }} 
    /> 
  </div> 
</div> 


);
}

/* =====================================================================
RESERVATIONS TAB
\===================================================================== */

function ReservationsTab({
restaurantName,
reservations,
allReservations,
search,
setSearch,
statusFilter,
setStatusFilter,
partyFilter,
setPartyFilter,
resetFilters,
onOpenReservation,
onConfirm,
onDecline,
onSeat,
onComplete,
updatingReservationId,
}: {
restaurantName: string;
reservations: NormalizedReservation[];
allReservations: NormalizedReservation[];
search: string;
setSearch: (value: string) => void;
statusFilter: string;
setStatusFilter: (value: string) => void;
partyFilter: string;
setPartyFilter: (value: string) => void;
resetFilters: () => void;
onOpenReservation: (
reservation: NormalizedReservation
) => void;
onConfirm: (id: number) => void;
onDecline: (id: number) => void;
onSeat: (id: number) => void;
onComplete: (id: number) => void;
updatingReservationId: number | null;
}) {
return (
<section className="flex flex-col gap-5">
<div className="flex flex-col md\:flex-row md\:items-center justify-between gap-4">
<div>
<h1
className="staff-headline text-3xl font-semibold tracking-tight"
style={{ color: COLORS.primary }}
>
Reservation Management System
</h1>


      <p 
        className="text-sm mt-1" 
        style={{ color: COLORS.outline }} 
      > 
        Filter, inspect, and process live reservations for your 
        assigned restaurant. 
      </p> 
    </div> 

    <div 
      className="text-[10px] px-3 py-2 rounded-full font-semibold" 
      style={{ 
        backgroundColor: COLORS.primaryFixed, 
        color: COLORS.primary, 
      }} 
    > 
      {allReservations.length} records loaded from Laravel 
    </div> 
  </div> 

  <div 
    className="p-5 rounded-xl shadow-sm flex flex-col lg\:flex-row items-stretch lg\:items-center justify-between gap-4" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div className="flex-1 flex flex-col sm\:flex-row gap-3"> 
      <div className="relative w-full sm\:w-80"> 
        <span 
          className="material-symbols-outlined absolute left-3 top-2.5 text-[20px]" 
          style={{ color: COLORS.outline }} 
        > 
          search 
        </span> 

        <input 
          value={search} 
          onChange={(event) => 
            setSearch(event.target.value) 
          } 
          placeholder="Search guest, phone, email, table, or ID..." 
          className="w-full pl-10 pr-3 py-2.5 rounded-lg text-xs outline-none" 
          style={{ 
            backgroundColor: COLORS.surfaceLow, 
          }} 
        /> 
      </div> 

      <select 
        value={statusFilter} 
        onChange={(event) => 
          setStatusFilter(event.target.value) 
        } 
        className="w-full sm\:w-48 py-2.5 px-3 rounded-lg text-xs outline-none" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        <option value="ALL">All Statuses</option> 
        <option value="pending">Pending Review</option> 
        <option value="confirmed">Confirmed</option> 
        <option value="seated">Seated Now</option> 
        <option value="completed">Completed</option> 
        <option value="declined">Declined</option> 
        <option value="cancelled">Cancelled</option> 
      </select> 

      <select 
        value={partyFilter} 
        onChange={(event) => 
          setPartyFilter(event.target.value) 
        } 
        className="w-full sm\:w-40 py-2.5 px-3 rounded-lg text-xs outline-none" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        <option value="ALL">Any Party Size</option> 
        <option value="1-2">1 - 2 Guests</option> 
        <option value="3-5">3 - 5 Guests</option> 
        <option value="6+">6+ Guests</option> 
      </select> 
    </div> 

    <div className="flex items-center gap-3 justify-end"> 
      <button 
        type="button" 
        onClick={resetFilters} 
        className="text-xs font-semibold hover\:underline" 
        style={{ 
          color: COLORS.secondary, 
        }} 
      > 
        Reset 
      </button> 

      <div 
        className="h-6 w-px" 
        style={{ 
          backgroundColor: COLORS.surfaceHighest, 
        }} 
      /> 

      <span 
        className="text-[10px] font-semibold" 
        style={{ color: COLORS.outline }} 
      > 
        Showing {reservations.length} Records 
      </span> 
    </div> 
  </div> 

  <div 
    className="rounded-xl shadow-sm overflow-hidden" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div 
      className="p-4 flex items-center justify-between" 
      style={{ 
        backgroundColor: COLORS.surfaceLow, 
      }} 
    > 
      <div className="flex items-center gap-2"> 
        <span 
          className="text-xs font-bold" 
          style={{ color: COLORS.primary }} 
        > 
          Shift Manifest • {restaurantName} 
        </span> 

        <span 
          className="text-[9px] px-2 py-1 rounded-full font-semibold" 
          style={{ 
            backgroundColor: COLORS.primaryFixed, 
            color: COLORS.primary, 
          }} 
        > 
          Live 
        </span> 
      </div> 

      <span 
        className="hidden sm\:block text-[10px]" 
        style={{ color: COLORS.outline }} 
      > 
        Synced with Laravel 
      </span> 
    </div> 

    <ReservationTable 
      reservations={reservations} 
      onOpen={onOpenReservation} 
      onConfirm={onConfirm} 
      onDecline={onDecline} 
      onSeat={onSeat} 
      onComplete={onComplete} 
      updatingReservationId={updatingReservationId} 
    /> 
  </div> 
</section> 


);
}

/* =====================================================================
RESERVATION TABLE
\===================================================================== */

function ReservationTable({
reservations,
compact = false,
onOpen,
onConfirm,
onDecline,
onSeat,
onComplete,
updatingReservationId,
}: {
reservations: NormalizedReservation[];
compact?: boolean;
onOpen: (reservation: NormalizedReservation) => void;
onConfirm: (id: number) => void;
onDecline: (id: number) => void;
onSeat: (id: number) => void;
onComplete: (id: number) => void;
updatingReservationId: number | null;
}) {
return (
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr
className="text-[9px] uppercase tracking-wider"
style={{
backgroundColor: COLORS.surfaceContainer,
color: COLORS.outline,
}}
>
<th className="py-3 px-4">Time</th>
<th className="py-3 px-4">Guest / Contact</th>
<th className="py-3 px-4">Party</th>
<th className="py-3 px-4">Table</th>
{!compact && (
<>
<th className="py-3 px-4">Notes</th>
<th className="py-3 px-4">Date</th>
</>
)}
<th className="py-3 px-4">Status</th>
<th className="py-3 px-4 text-right">
Actions
</th>
</tr>
</thead>


    <tbody> 
      {reservations.length === 0 ? ( 
        <tr> 
          <td 
            colSpan={compact ? 6 : 8} 
            className="py-14 text-center" 
          > 
            <div className="flex flex-col items-center gap-2"> 
              <span 
                className="material-symbols-outlined text-[32px]" 
                style={{ color: COLORS.outlineVariant }} 
              > 
                event_busy 
              </span> 

              <span 
                className="text-xs font-semibold" 
                style={{ color: COLORS.outline }} 
              > 
                No reservations match the current filters. 
              </span> 
            </div> 
          </td> 
        </tr> 
      ) : ( 
        reservations.map((reservation) => { 
          const updating = 
            updatingReservationId === reservation.id; 

          return ( 
            <tr 
              key={reservation.id} 
              className="border-t hover\:bg-[#f6f3f2] transition-colors" 
              style={{ 
                borderColor: COLORS.surfaceHigh, 
              }} 
            > 
              <td className="py-3.5 px-4"> 
                <span className="text-xs font-bold"> 
                  {formatTime(reservation.time)} 
                </span> 
              </td> 

              <td className="py-3.5 px-4"> 
                <span className="block text-xs font-bold"> 
                  {reservation.guest} 
                </span> 

                <span 
                  className="block text-[10px] mt-0.5" 
                  style={{ color: COLORS.outline }} 
                > 
                  {reservation.phone || 
                    reservation.email || 
                    "No contact"} 
                </span> 
              </td> 

              <td className="py-3.5 px-4"> 
                <span className="text-xs font-semibold"> 
                  {reservation.party} Pax 
                </span> 
              </td> 

              <td className="py-3.5 px-4"> 
                <span 
                  className="font-mono text-xs font-semibold" 
                  style={{ color: COLORS.secondary }} 
                > 
                  {reservation.table} 
                </span> 
              </td> 

              {!compact && ( 
                <> 
                  <td className="py-3.5 px-4 max-w-[260px]"> 
                    <span 
                      className="block text-xs font-medium truncate" 
                      title={ 
                        reservation.specialRequests || 
                        reservation.notes 
                      } 
                    > 
                      {reservation.specialRequests || 
                        reservation.notes || 
                        "Standard service"} 
                    </span> 
                  </td> 

                  <td className="py-3.5 px-4"> 
                    <span className="text-[10px] font-semibold"> 
                      {formatDate(reservation.date)} 
                    </span> 
                  </td> 
                </> 
              )} 

              <td className="py-3.5 px-4"> 
                <span 
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${statusClasses( 
                    reservation.status 
                  )}`} 
                > 
                  {reservation.status} 
                </span> 
              </td> 

              <td className="py-3.5 px-4 text-right"> 
                <div className="flex items-center justify-end gap-1.5"> 
                  {reservation.status === "pending" && ( 
                    <> 
                      <ActionButton 
                        label="Confirm" 
                        onClick={() => 
                          onConfirm(reservation.id) 
                        } 
                        disabled={updating} 
                        primary 
                      /> 

                      <ActionButton 
                        label="Decline" 
                        onClick={() => 
                          onDecline(reservation.id) 
                        } 
                        disabled={updating} 
                      /> 
                    </> 
                  )} 

                  {reservation.status === "confirmed" && ( 
                    <ActionButton 
                      label="Seat Guest" 
                      onClick={() => 
                        onSeat(reservation.id) 
                      } 
                      disabled={updating} 
                      secondary 
                    /> 
                  )} 

                  {reservation.status === "seated" && ( 
                    <ActionButton 
                      label="Complete" 
                      onClick={() => 
                        onComplete(reservation.id) 
                      } 
                      disabled={updating} 
                    /> 
                  )} 

                  <button 
                    type="button" 
                    onClick={() => onOpen(reservation)} 
                    className="p-1.5 rounded hover\:bg-[#f0edec]" 
                    title="View reservation" 
                  > 
                    <span 
                      className="material-symbols-outlined text-[18px]" 
                      style={{ color: COLORS.outline }} 
                    > 
                      more_vert 
                    </span> 
                  </button> 
                </div> 
              </td> 
            </tr> 
          ); 
        }) 
      )} 
    </tbody> 
  </table> 
</div> 


);
}

/* =====================================================================
ACTION BUTTON
\===================================================================== */

function ActionButton({
label,
onClick,
disabled,
primary,
secondary,
}: {
label: string;
onClick: () => void;
disabled?: boolean;
primary?: boolean;
secondary?: boolean;
}) {
return (
<button
type="button"
onClick={onClick}
disabled={disabled}
className="px-2.5 py-1.5 rounded text-[10px] font-semibold disabled\:opacity-50"
style={{
backgroundColor: primary
? COLORS.primary
: secondary
? COLORS.secondary
: COLORS.surfaceContainer,
color: primary || secondary ? "#fff" : COLORS.onSurface,
}}
>
{disabled ? "…" : label}
</button>
);
}

/* =====================================================================
FILTER PILL
\===================================================================== */

function FilterPill({
active,
label,
onClick,
}: {
active: boolean;
label: string;
onClick: () => void;
}) {
return (
<button
type="button"
onClick={onClick}
className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
style={{
backgroundColor: active
? COLORS.primary
: COLORS.surfaceContainer,
color: active ? "#fff" : COLORS.outline,
}}
>
{label}
</button>
);
}

/* =====================================================================
TABLES TAB
\===================================================================== */

function TablesTab({
restaurantName,
tables,
availableCount,
occupiedCount,
reservedCount,
onOpenTable,
onUpdateStatus,
updatingTableId,
}: {
restaurantName: string;
tables: Table[];
availableCount: number;
occupiedCount: number;
reservedCount: number;
onOpenTable: (table: Table) => void;
onUpdateStatus: (
table: Table,
status: TableStatus
) => void;
updatingTableId: number | null;
}) {
return (
<section className="flex flex-col gap-6">
<div className="flex flex-col md\:flex-row md\:items-center justify-between gap-4">
<div>
<h1
className="staff-headline text-3xl font-semibold tracking-tight"
style={{ color: COLORS.primary }}
>
Main Dining Floor & Mesob Suites
</h1>


      <p 
        className="text-sm mt-1" 
        style={{ color: COLORS.outline }} 
      > 
        Manage table availability, occupancy, cleaning, and 
        seating status for {restaurantName}. 
      </p> 
    </div> 

    <div className="flex items-center gap-2 flex-wrap"> 
      <StatusLegend 
        color={COLORS.primary} 
        label={`${availableCount} Free`} 
      /> 

      <StatusLegend 
        color={COLORS.secondary} 
        label={`${occupiedCount} Occupied`} 
      /> 

      <StatusLegend 
        color={COLORS.tertiary} 
        label={`${reservedCount} Reserved`} 
      /> 
    </div> 
  </div> 

  <div 
    className="rounded-xl p-6 shadow-sm" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div 
      className="flex items-center justify-between pb-4 border-b" 
      style={{ 
        borderColor: COLORS.surfaceHigh, 
      }} 
    > 
      <div className="flex items-center gap-2"> 
        <span 
          className="staff-headline text-xl font-semibold" 
          style={{ color: COLORS.primary }} 
        > 
          Floor Plan 
        </span> 

        <span 
          className="text-[9px] px-2 py-1 rounded font-mono" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
            color: COLORS.outline, 
          }} 
        > 
          LIVE DATA 
        </span> 
      </div> 

      <span 
        className="hidden md\:block text-[10px]" 
        style={{ color: COLORS.outline }} 
      > 
        Click any table for operations 
      </span> 
    </div> 

    {tables.length === 0 ? ( 
      <div className="py-16 text-center"> 
        <span 
          className="material-symbols-outlined text-[36px]" 
          style={{ color: COLORS.outlineVariant }} 
        > 
          table_restaurant 
        </span> 

        <p 
          className="text-xs font-semibold mt-2" 
          style={{ color: COLORS.outline }} 
        > 
          No tables returned for this restaurant. 
        </p> 
      </div> 
    ) : ( 
      <div className="grid grid-cols-1 sm\:grid-cols-2 md\:grid-cols-3 xl\:grid-cols-4 gap-4 mt-5"> 
        {tables.map((table) => { 
          const status = table.status || "available"; 
          const updating = 
            updatingTableId === table.id; 

          return ( 
            <div 
              key={table.id} 
              className="p-4 rounded-xl transition-all hover\:scale-[1.01] cursor-pointer" 
              style={{ 
                backgroundColor: 
                  status === "occupied" 
                    ? "rgba(147,74,45,0.08)" 
                    : status === "reserved" 
                      ? "rgba(115,92,0,0.08)" 
                      : status === "maintenance" 
                        ? "rgba(186,26,26,0.06)" 
                        : COLORS.surfaceLow, 
              }} 
              onClick={() => onOpenTable(table)} 
            > 
              <div className="flex items-center justify-between"> 
                <span 
                  className="staff-headline text-xl font-bold" 
                  style={{ 
                    color: 
                      status === "occupied" 
                        ? COLORS.secondary 
                        : status === "reserved" 
                          ? COLORS.tertiary 
                          : COLORS.primary, 
                  }} 
                > 
                  {tableDisplayName(table)} 
                </span> 

                <span 
                  className={`px-2 py-1 rounded-full text-[9px] font-bold capitalize ${tableStatusClasses( 
                    status 
                  )}`} 
                > 
                  {status} 
                </span> 
              </div> 

              <div className="mt-7"> 
                <span className="block text-xs font-semibold"> 
                  {table.capacity} Pax Capacity 
                </span> 

                <span 
                  className="block text-[10px] mt-1" 
                  style={{ color: COLORS.outline }} 
                > 
                  Restaurant Table #{table.id} 
                </span> 
              </div> 

              <div className="pt-3 mt-3 border-t flex items-center justify-between"> 
                <span 
                  className="text-[10px]" 
                  style={{ color: COLORS.outline }} 
                > 
                  Status control 
                </span> 

                <select 
                  value={status} 
                  disabled={updating} 
                  onClick={(event) => 
                    event.stopPropagation() 
                  } 
                  onChange={(event) => { 
                    event.stopPropagation(); 

                    onUpdateStatus( 
                      table, 
                      event.target.value 
                    ); 
                  }} 
                  className="text-[10px] font-semibold rounded px-2 py-1 outline-none" 
                  style={{ 
                    backgroundColor: "#fff", 
                  }} 
                > 
                  <option value="available"> 
                    Available 
                  </option> 
                  <option value="occupied"> 
                    Occupied 
                  </option> 
                  <option value="reserved"> 
                    Reserved 
                  </option> 
                  <option value="cleaning"> 
                    Cleaning 
                  </option> 
                  <option value="maintenance"> 
                    Maintenance 
                  </option> 
                </select> 
              </div> 
            </div> 
          ); 
        })} 
      </div> 
    )} 
  </div> 
</section> 


);
}

/* =====================================================================
STATUS LEGEND
\===================================================================== */

function StatusLegend({
color,
label,
}: {
color: string;
label: string;
}) {
return (
<span
className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full"
style={{
backgroundColor: COLORS.surfaceContainer,
}}
>
<span
className="w-2.5 h-2.5 rounded-full"
style={{ backgroundColor: color }}
/>


  {label} 
</span> 


);
}

/* =====================================================================
RESTAURANT TAB
\===================================================================== */

function RestaurantTab({
restaurant,
tables,
reservations,
onShareLocation,
}: {
restaurant: Restaurant | null;
tables: Table[];
reservations: NormalizedReservation[];
onShareLocation: () => void;
}) {
if (!restaurant) {
return (
<EmptyState
icon="storefront"
title="Restaurant data unavailable"
message="The Laravel restaurant endpoint did not return a restaurant."
/>
);
}

const address = [
restaurant.address,
restaurant.city,
restaurant.state,
restaurant.zip,
]
.filter(Boolean)
.join(", ");

return (
<section className="flex flex-col gap-6">
<div className="flex flex-col md\:flex-row md\:items-center justify-between gap-4">
<div>
<h1
className="staff-headline text-3xl font-semibold tracking-tight"
style={{ color: COLORS.primary }}
>
{restaurant.name} • Venue Operations
</h1>


      <p 
        className="text-sm mt-1" 
        style={{ color: COLORS.outline }} 
      > 
        Live restaurant configuration loaded from Laravel. 
      </p> 
    </div> 

    <div 
      className="text-[10px] font-bold px-3 py-2 rounded-full flex items-center gap-1" 
      style={{ 
        backgroundColor: restaurant.is_active 
          ? COLORS.primaryFixed 
          : "#ffdad6", 
        color: restaurant.is_active 
          ? COLORS.primary 
          : "#93000a", 
      }} 
    > 
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" /> 
      {restaurant.is_active ? "Venue Active" : "Venue Inactive"} 
    </div> 
  </div> 

  <div className="grid grid-cols-1 lg\:grid-cols-3 gap-5"> 
    <div 
      className="lg\:col-span-2 p-5 rounded-xl shadow-sm flex flex-col gap-5" 
      style={{ 
        backgroundColor: "#fff", 
      }} 
    > 
      <div 
        className="flex flex-col sm\:flex-row items-start sm\:items-center justify-between gap-3 pb-4 border-b" 
        style={{ 
          borderColor: COLORS.surfaceHigh, 
        }} 
      > 
        <div className="flex items-center gap-3"> 
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center" 
            style={{ 
              backgroundColor: COLORS.primaryContainer, 
              color: "#fff", 
            }} 
          > 
            <span className="material-symbols-outlined text-[30px]"> 
              soup_kitchen 
            </span> 
          </div> 

          <div> 
            <h3 
              className="staff-headline text-xl font-semibold" 
              style={{ color: COLORS.primary }} 
            > 
              {restaurant.name} 
            </h3> 

            <span 
              className="text-[10px]" 
              style={{ color: COLORS.outline }} 
            > 
              {address || "Address not configured"} 
            </span> 
          </div> 
        </div> 

        <span 
          className="text-[10px] px-3 py-1.5 rounded-full font-bold" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
            color: COLORS.secondary, 
          }} 
        > 
          {restaurant.price_range || "Price range not set"} 
        </span> 
      </div> 

      <div className="grid grid-cols-1 sm\:grid-cols-2 gap-5"> 
        <VenueField 
          label="Cuisine & Concept" 
          value={ 
            restaurant.cuisine_type || 
            "Cuisine not configured" 
          } 
        /> 

        <VenueField 
          label="Service Hours" 
          value={formatRestaurantHours(restaurant.hours)} 
        /> 

        <VenueField 
          label="Direct Phone" 
          value={ 
            restaurant.phone || "Phone not configured" 
          } 
        /> 

        <VenueField 
          label="Restaurant Email" 
          value={ 
            restaurant.email || "Email not configured" 
          } 
        /> 

        <VenueField 
          label="Tables" 
          value={`${tables.length} configured tables`} 
        /> 

        <VenueField 
          label="Today's Reservations" 
          value={`${reservations.length} reservations`} 
        /> 
      </div> 

      {restaurant.description && ( 
        <div 
          className="pt-4 border-t" 
          style={{ 
            borderColor: COLORS.surfaceHigh, 
          }} 
        > 
          <span 
            className="text-[10px] uppercase tracking-wider font-semibold" 
            style={{ color: COLORS.outline }} 
          > 
            Description 
          </span> 

          <p className="text-xs mt-2 leading-6"> 
            {restaurant.description} 
          </p> 
        </div> 
      )} 
    </div> 

    <div 
      className="p-5 rounded-xl shadow-sm flex flex-col justify-between" 
      style={{ 
        backgroundColor: "#fff", 
      }} 
    > 
      <div> 
        <div className="flex items-center justify-between mb-4"> 
          <span 
            className="text-xs font-bold" 
            style={{ color: COLORS.primary }} 
          > 
            Location Landmark 
          </span> 

          <span 
            className="material-symbols-outlined" 
            style={{ color: COLORS.secondary }} 
          > 
            pin_drop 
          </span> 
        </div> 

        <div 
          className="w-full h-48 rounded-xl flex flex-col items-center justify-center text-center p-4" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
          }} 
        > 
          <span 
            className="material-symbols-outlined text-[36px]" 
            style={{ color: COLORS.primary }} 
          > 
            explore 
          </span> 

          <span 
            className="text-xs font-bold mt-2" 
            style={{ color: COLORS.primary }} 
          > 
            {restaurant.city || "Restaurant Location"} 
          </span> 

          <span 
            className="text-[10px] mt-1" 
            style={{ color: COLORS.outline }} 
          > 
            {address || "No address configured"} 
          </span> 
        </div> 

        <div 
          className="mt-4 text-[10px] space-y-2" 
          style={{ color: COLORS.outline }} 
        > 
          <p> 
            <strong>Active:</strong>{" "} 
            {restaurant.is_active ? "Yes" : "No"} 
          </p> 

          <p> 
            <strong>Approved:</strong>{" "} 
            {restaurant.approved ? "Yes" : "No"} 
          </p> 
        </div> 
      </div> 

      <button 
        type="button" 
        onClick={onShareLocation} 
        className="w-full mt-4 py-2.5 rounded-lg text-xs font-bold" 
        style={{ 
          backgroundColor: COLORS.surfaceContainer, 
          color: COLORS.primary, 
        }} 
      > 
        Share Location 
      </button> 
    </div> 
  </div> 
</section> 


);
}

/* =====================================================================
VENUE FIELD
\===================================================================== */

function VenueField({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div>
<span
className="text-[9px] uppercase tracking-wider font-semibold"
style={{ color: COLORS.outline }}
>
{label}
</span>


  <p 
    className="text-xs font-semibold mt-1" 
    style={{ color: COLORS.primary }} 
  > 
    {value} 
  </p> 
</div> 


);
}

/* =====================================================================
PROFILE TAB
\===================================================================== */

function ProfileTab({
user,
restaurant,
onRefresh,
onLogout,
}: {
user: User | null;
restaurant: Restaurant | null;
onRefresh: () => void;
onLogout: () => void;
}) {
const name = user?.name || "Staff Member";

return (
<section className="flex flex-col gap-6">
<div className="flex flex-col md\:flex-row md\:items-center justify-between gap-4">
<div>
<h1
className="staff-headline text-3xl font-semibold tracking-tight"
style={{ color: COLORS.primary }}
>
Host Profile & Laravel API Architecture
</h1>


      <p 
        className="text-sm mt-1" 
        style={{ color: COLORS.outline }} 
      > 
        Live authenticated session and the API endpoints used by 
        this staff interface. 
      </p> 
    </div> 

    <span 
      className="px-3 py-2 rounded-full text-[10px] font-mono font-bold" 
      style={{ 
        backgroundColor: COLORS.surfaceContainer, 
        color: COLORS.primary, 
      }} 
    > 
      JWT SESSION ACTIVE 
    </span> 
  </div> 

  <div className="grid grid-cols-1 lg\:grid-cols-3 gap-5"> 
    <div 
      className="p-5 rounded-xl shadow-sm flex flex-col justify-between" 
      style={{ 
        backgroundColor: "#fff", 
      }} 
    > 
      <div> 
        <div className="flex items-center gap-3 mb-6"> 
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg" 
            style={{ 
              backgroundColor: COLORS.primary, 
            }} 
          > 
            {initials(name)} 
          </div> 

          <div> 
            <h3 
              className="staff-headline text-xl font-semibold" 
              style={{ color: COLORS.primary }} 
            > 
              {name} 
            </h3> 

            <span 
              className="text-[9px] px-2 py-1 rounded-full font-bold" 
              style={{ 
                backgroundColor: COLORS.secondary, 
                color: "#fff", 
              }} 
            > 
              {user?.role === "admin" 
                ? "Administrator" 
                : "Restaurant Staff"} 
            </span> 
          </div> 
        </div> 

        <div className="space-y-3"> 
          <ProfileField 
            label="Email" 
            value={user?.email || "Not available"} 
          /> 

          <ProfileField 
            label="Phone" 
            value={user?.phone || "Not configured"} 
          /> 

          <ProfileField 
            label="Staff User ID" 
            value={ 
              user?.id 
                ? `#${user.id}` 
                : "Not available" 
            } 
          /> 

          <ProfileField 
            label="Assigned Restaurant" 
            value={ 
              restaurant?.name || 
              "No restaurant assigned" 
            } 
          /> 

          <ProfileField 
            label="Account Status" 
            value={ 
              user?.is_active === false 
                ? "Suspended" 
                : "Active" 
            } 
          /> 
        </div> 
      </div> 

      <div 
        className="pt-4 mt-5 border-t flex flex-col gap-2" 
        style={{ 
          borderColor: COLORS.surfaceHigh, 
        }} 
      > 
        <button 
          type="button" 
          onClick={onRefresh} 
          className="w-full py-2.5 rounded-lg text-xs font-bold" 
          style={{ 
            backgroundColor: COLORS.primary, 
            color: "#fff", 
          }} 
        > 
          Refresh Session Data 
        </button> 

        <button 
          type="button" 
          onClick={onLogout} 
          className="w-full py-2.5 rounded-lg text-xs font-semibold" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
            color: COLORS.secondary, 
          }} 
        > 
          Sign Out 
        </button> 
      </div> 
    </div> 

    <div 
      className="lg\:col-span-2 p-5 rounded-xl shadow-sm flex flex-col gap-4" 
      style={{ 
        backgroundColor: "#fff", 
      }} 
    > 
      <div 
        className="flex items-center justify-between pb-4 border-b" 
        style={{ 
          borderColor: COLORS.surfaceHigh, 
        }} 
      > 
        <div className="flex items-center gap-2"> 
          <span 
            className="material-symbols-outlined" 
            style={{ color: COLORS.primary }} 
          > 
            terminal 
          </span> 

          <h3 
            className="text-xs font-bold" 
            style={{ color: COLORS.primary }} 
          > 
            Laravel REST Client Integration 
          </h3> 
        </div> 

        <span 
          className="text-[9px] font-mono px-2 py-1 rounded" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
            color: COLORS.outline, 
          }} 
        > 
          Bearer Auth 
        </span> 
      </div> 

      <div className="grid grid-cols-1 md\:grid-cols-2 gap-3"> 
        <ApiEndpointCard 
          title="Authenticated Endpoints" 
          endpoints={[ 
            "GET /api/auth/me", 
            "GET /api/restaurants/{id}", 
            "GET /api/restaurants/{id}/reservations", 
            "GET /api/restaurants/{id}/tables", 
          ]} 
        /> 

        <ApiEndpointCard 
          title="Mutation Endpoints" 
          endpoints={[ 
            "PUT /api/reservations/{id}/status", 
            "PUT /api/restaurants/{id}/tables/{table}", 
          ]} 
        /> 
      </div> 

      <div 
        className="rounded-xl p-4 overflow-x-auto" 
        style={{ 
          backgroundColor: "#313030", 
          color: "#f3f0ef", 
        }} 
      > 
        <pre className="text-[10px] leading-5 font-mono whitespace-pre-wrap"> 


{`// Reservation status update
await apiFetch("/reservations/{id}/status", {
method: "PUT",
headers: {
"Content-Type": "application/json",
"Accept": "application/json",
},
body: JSON.stringify({
status: "confirmed",
}),
});

// Restaurant table status update
await apiFetch(
"/restaurants/{restaurantId}/tables/{tableId}",
{
method: "PUT",
body: JSON.stringify({
status: "available",
}),
}
);`}
</pre>
</div>


      <div 
        className="p-4 rounded-lg" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        <div 
          className="text-[10px] font-bold mb-2" 
          style={{ color: COLORS.primary }} 
        > 
          Reservation State Machine 
        </div> 

        <div className="flex flex-wrap items-center gap-2 text-[10px]"> 
          <StateBadge label="pending" /> 
          <span>→</span> 
          <StateBadge label="confirmed" /> 
          <span>→</span> 
          <StateBadge label="seated" /> 
          <span>→</span> 
          <StateBadge label="completed" /> 
        </div> 

        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]"> 
          <StateBadge label="pending" /> 
          <span>→</span> 
          <StateBadge label="declined" error /> 
        </div> 
      </div> 
    </div> 
  </div> 
</section> 


);
}

/* =====================================================================
PROFILE FIELD
\===================================================================== */

function ProfileField({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div
className="p-3 rounded-lg"
style={{
backgroundColor: COLORS.surfaceLow,
}}
>
<span
className="text-[9px] uppercase tracking-wider block font-semibold"
style={{ color: COLORS.outline }}
>
{label}
</span>


  <span 
    className="text-xs font-bold block mt-1" 
    style={{ color: COLORS.primary }} 
  > 
    {value} 
  </span> 
</div> 


);
}

/* =====================================================================
API CARD
\===================================================================== */

function ApiEndpointCard({
title,
endpoints,
}: {
title: string;
endpoints: string[];
}) {
return (
<div
className="p-4 rounded-lg"
style={{
backgroundColor: COLORS.surfaceLow,
}}
>
<span
className="text-[10px] font-bold block mb-2"
style={{ color: COLORS.primary }}
>
{title}
</span>


  <ul 
    className="space-y-2 text-[10px] font-mono" 
    style={{ color: COLORS.outline }} 
  > 
    {endpoints.map((endpoint) => ( 
      <li key={endpoint}>{endpoint}</li> 
    ))} 
  </ul> 
</div> 


);
}

/* =====================================================================
STATE BADGE
\===================================================================== */

function StateBadge({
label,
error,
}: {
label: string;
error?: boolean;
}) {
return (
<span
className="px-2 py-1 rounded-full font-semibold"
style={{
backgroundColor: error
? "#ffdad6"
: COLORS.primaryFixed,
color: error ? "#93000a" : COLORS.primary,
}}
>
{label}
</span>
);
}

/* =====================================================================
RESERVATION DRAWER
\===================================================================== */

function ReservationDrawer({
reservation,
onClose,
onConfirm,
onDecline,
onSeat,
onComplete,
updatingReservationId,
}: {
reservation: NormalizedReservation;
onClose: () => void;
onConfirm: (id: number) => void;
onDecline: (id: number) => void;
onSeat: (id: number) => void;
onComplete: (id: number) => void;
updatingReservationId: number | null;
}) {
const updating =
updatingReservationId === reservation.id;

return (
<div className="fixed inset-0 z-[80]">
<div
className="absolute inset-0 backdrop-blur-sm"
style={{
backgroundColor: "rgba(49,48,48,0.40)",
}}
onClick={onClose}
/>


  <div 
    className="absolute right-0 top-0 bottom-0 w-full max-w-md p-5 flex flex-col justify-between overflow-y-auto shadow-2xl" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div className="flex flex-col gap-5"> 
      <div 
        className="flex items-center justify-between pb-4 border-b" 
        style={{ 
          borderColor: COLORS.surfaceHigh, 
        }} 
      > 
        <div> 
          <span 
            className="text-[9px] uppercase tracking-wider font-semibold" 
            style={{ color: COLORS.outline }} 
          > 
            Reservation Profile 
          </span> 

          <h3 
            className="staff-headline text-2xl font-semibold" 
            style={{ color: COLORS.primary }} 
          > 
            {reservation.guest} 
          </h3> 
        </div> 

        <button 
          type="button" 
          onClick={onClose} 
          className="w-8 h-8 rounded-full flex items-center justify-center" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
          }} 
        > 
          <span className="material-symbols-outlined text-[18px]"> 
            close 
          </span> 
        </button> 
      </div> 

      <div 
        className="flex items-center justify-between px-3 py-4 rounded-xl" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        {[ 
          "pending", 
          "confirmed", 
          "seated", 
          "completed", 
        ].map((step, index) => { 
          const active = 
            reservation.status === step; 

          const completed = 
            [ 
              "pending", 
              "confirmed", 
              "seated", 
              "completed", 
            ].indexOf(reservation.status) >= index; 

          return ( 
            <div 
              key={step} 
              className="flex flex-col items-center gap-1" 
            > 
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" 
                style={{ 
                  backgroundColor: 
                    completed || active 
                      ? COLORS.primary 
                      : COLORS.surfaceHighest, 
                  color: 
                    completed || active 
                      ? "#fff" 
                      : COLORS.outline, 
                }} 
              > 
                {index + 1} 
              </span> 

              <span 
                className="text-[8px] capitalize font-semibold" 
                style={{ 
                  color: 
                    active || completed 
                      ? COLORS.primary 
                      : COLORS.outline, 
                }} 
              > 
                {step} 
              </span> 
            </div> 
          ); 
        })} 
      </div> 

      <div className="grid grid-cols-2 gap-3"> 
        <DrawerField 
          label="Party / Table" 
          value={`${reservation.party} Pax • ${reservation.table}`} 
        /> 

        <DrawerField 
          label="Status" 
          value={reservation.status} 
        /> 

        <DrawerField 
          label="Date" 
          value={formatDate(reservation.date)} 
        /> 

        <DrawerField 
          label="Time" 
          value={formatTime(reservation.time)} 
        /> 
      </div> 

      <DrawerField 
        label="Phone" 
        value={reservation.phone || "Not provided"} 
      /> 

      <DrawerField 
        label="Email" 
        value={reservation.email || "Not provided"} 
      /> 

      <DrawerField 
        label="Special Requests" 
        value={ 
          reservation.specialRequests || 
          "No special requests recorded." 
        } 
      /> 

      <DrawerField 
        label="Notes" 
        value={ 
          reservation.notes || 
          "No reservation notes recorded." 
        } 
      /> 
    </div> 

    <div 
      className="pt-4 mt-5 border-t flex flex-col gap-2" 
      style={{ 
        borderColor: COLORS.surfaceHigh, 
      }} 
    > 
      {reservation.status === "pending" && ( 
        <> 
          <button 
            type="button" 
            disabled={updating} 
            onClick={() => onConfirm(reservation.id)} 
            className="w-full py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
            style={{ 
              backgroundColor: COLORS.primary, 
              color: "#fff", 
            }} 
          > 
            {updating 
              ? "Updating…" 
              : "Confirm Reservation"} 
          </button> 

          <button 
            type="button" 
            disabled={updating} 
            onClick={() => onDecline(reservation.id)} 
            className="w-full py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
            style={{ 
              backgroundColor: "#ffdad6", 
              color: "#93000a", 
            }} 
          > 
            Decline Booking 
          </button> 
        </> 
      )} 

      {reservation.status === "confirmed" && ( 
        <button 
          type="button" 
          disabled={updating} 
          onClick={() => onSeat(reservation.id)} 
          className="w-full py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
          style={{ 
            backgroundColor: COLORS.secondary, 
            color: "#fff", 
          }} 
        > 
          {updating ? "Updating…" : "Seat Guest"} 
        </button> 
      )} 

      {reservation.status === "seated" && ( 
        <button 
          type="button" 
          disabled={updating} 
          onClick={() => onComplete(reservation.id)} 
          className="w-full py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
          style={{ 
            backgroundColor: COLORS.surfaceHighest, 
            color: COLORS.primary, 
          }} 
        > 
          {updating 
            ? "Updating…" 
            : "Mark Service Complete"} 
        </button> 
      )} 

      <button 
        type="button" 
        onClick={onClose} 
        className="w-full py-2 rounded-lg text-xs font-medium" 
        style={{ 
          backgroundColor: COLORS.surfaceContainer, 
        }} 
      > 
        Close Panel 
      </button> 
    </div> 
  </div> 
</div> 


);
}

/* =====================================================================
DRAWER FIELD
\===================================================================== */

function DrawerField({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div
className="p-3 rounded-xl"
style={{
backgroundColor: COLORS.surfaceLow,
}}
>
<span
className="text-[9px] block font-semibold"
style={{ color: COLORS.outline }}
>
{label}
</span>


  <p 
    className="mt-1 text-xs font-semibold leading-5" 
    style={{ color: COLORS.primary }} 
  > 
    {value} 
  </p> 
</div> 


);
}

/* =====================================================================
TABLE DRAWER
\===================================================================== */

function TableDrawer({
table,
restaurantName,
onClose,
onUpdateStatus,
updating,
}: {
table: Table;
restaurantName: string;
onClose: () => void;
onUpdateStatus: (
table: Table,
status: TableStatus
) => void;
updating: boolean;
}) {
const status = table.status || "available";

return (
<div className="fixed inset-0 z-[80]">
<div
className="absolute inset-0 backdrop-blur-sm"
style={{
backgroundColor: "rgba(49,48,48,0.40)",
}}
onClick={onClose}
/>


  <div 
    className="absolute right-0 top-0 bottom-0 w-full max-w-md p-5 flex flex-col justify-between shadow-2xl" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div className="flex flex-col gap-5"> 
      <div 
        className="flex items-center justify-between pb-4 border-b" 
        style={{ 
          borderColor: COLORS.surfaceHigh, 
        }} 
      > 
        <div> 
          <span 
            className="text-[9px] uppercase tracking-wider font-semibold" 
            style={{ color: COLORS.outline }} 
          > 
            Table Operations 
          </span> 

          <h3 
            className="staff-headline text-2xl font-semibold" 
            style={{ color: COLORS.primary }} 
          > 
            {tableDisplayName(table)} 
          </h3> 

          <p 
            className="text-[10px]" 
            style={{ color: COLORS.outline }} 
          > 
            {restaurantName} 
          </p> 
        </div> 

        <button 
          type="button" 
          onClick={onClose} 
          className="w-8 h-8 rounded-full flex items-center justify-center" 
          style={{ 
            backgroundColor: COLORS.surfaceContainer, 
          }} 
        > 
          <span className="material-symbols-outlined text-[18px]"> 
            close 
          </span> 
        </button> 
      </div> 

      <div 
        className="p-4 rounded-xl flex items-center justify-between" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        <div> 
          <span 
            className="text-[9px] block" 
            style={{ color: COLORS.outline }} 
          > 
            Current Status 
          </span> 

          <span 
            className="text-sm font-bold capitalize" 
            style={{ color: COLORS.primary }} 
          > 
            {status} 
          </span> 
        </div> 

        <span 
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${tableStatusClasses( 
            status 
          )}`} 
        > 
          {status} 
        </span> 
      </div> 

      <div className="grid grid-cols-2 gap-3"> 
        <DrawerField 
          label="Capacity" 
          value={`${table.capacity} Pax`} 
        /> 

        <DrawerField 
          label="Table ID" 
          value={`#${table.id}`} 
        /> 
      </div> 

      <div 
        className="p-4 rounded-xl" 
        style={{ 
          backgroundColor: COLORS.surfaceLow, 
        }} 
      > 
        <span 
          className="text-[9px] block font-semibold" 
          style={{ color: COLORS.outline }} 
        > 
          Backend Status Control 
        </span> 

        <select 
          value={status} 
          disabled={updating} 
          onChange={(event) => 
            onUpdateStatus( 
              table, 
              event.target.value 
            ) 
          } 
          className="w-full mt-2 px-3 py-2 rounded-lg text-xs outline-none" 
          style={{ 
            backgroundColor: "#fff", 
          }} 
        > 
          <option value="available"> 
            Available 
          </option> 
          <option value="occupied"> 
            Occupied 
          </option> 
          <option value="reserved"> 
            Reserved 
          </option> 
          <option value="cleaning"> 
            Cleaning 
          </option> 
          <option value="maintenance"> 
            Maintenance 
          </option> 
        </select> 
      </div> 
    </div> 

    <div 
      className="pt-4 mt-5 border-t" 
      style={{ 
        borderColor: COLORS.surfaceHigh, 
      }} 
    > 
      <button 
        type="button" 
        disabled={updating} 
        onClick={() => 
          onUpdateStatus(table, "available") 
        } 
        className="w-full py-2.5 rounded-lg text-xs font-bold disabled\:opacity-50" 
        style={{ 
          backgroundColor: COLORS.primary, 
          color: "#fff", 
        }} 
      > 
        {updating 
          ? "Updating Table…" 
          : "Mark as Available & Reset"} 
      </button> 

      <button 
        type="button" 
        onClick={onClose} 
        className="w-full mt-2 py-2 rounded-lg text-xs font-medium" 
        style={{ 
          backgroundColor: COLORS.surfaceContainer, 
        }} 
      > 
        Dismiss Drawer 
      </button> 
    </div> 
  </div> 
</div> 


);
}

/* =====================================================================
MODAL
\===================================================================== */

function Modal({
title,
subtitle,
onClose,
children,
}: {
title: string;
subtitle?: string;
onClose: () => void;
children: React.ReactNode;
}) {
return (
<div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
<div
className="absolute inset-0 backdrop-blur-sm"
style={{
backgroundColor: "rgba(49,48,48,0.45)",
}}
onClick={onClose}
/>


  <div 
    className="relative w-full max-w-md rounded-2xl p-5 shadow-2xl" 
    style={{ 
      backgroundColor: "#fff", 
    }} 
  > 
    <div className="flex items-start justify-between mb-5"> 
      <div> 
        <h3 
          className="staff-headline text-2xl font-semibold" 
          style={{ color: COLORS.primary }} 
        > 
          {title} 
        </h3> 

        {subtitle && ( 
          <p 
            className="text-[10px] mt-1" 
            style={{ color: COLORS.outline }} 
          > 
            {subtitle} 
          </p> 
        )} 
      </div> 

      <button 
        type="button" 
        onClick={onClose} 
        className="w-8 h-8 rounded-full flex items-center justify-center" 
        style={{ 
          backgroundColor: COLORS.surfaceContainer, 
        }} 
      > 
        <span className="material-symbols-outlined text-[18px]"> 
          close 
        </span> 
      </button> 
    </div> 

    {children} 
  </div> 
</div> 


);
}

/* =====================================================================
EMPTY STATE
\===================================================================== */

function EmptyState({
icon,
title,
message,
}: {
icon: string;
title: string;
message: string;
}) {
return (
<div
className="rounded-xl p-16 text-center shadow-sm"
style={{
backgroundColor: "#fff",
}}
>
<span
className="material-symbols-outlined text-[42px]"
style={{ color: COLORS.outlineVariant }}
>
{icon}
</span>


  <h2 
    className="staff-headline text-xl font-semibold mt-3" 
    style={{ color: COLORS.primary }} 
  > 
    {title} 
  </h2> 

  <p 
    className="text-xs mt-2" 
    style={{ color: COLORS.outline }} 
  > 
    {message} 
  </p> 
</div> 


);
}

/* =====================================================================
HOURS FORMATTER
\===================================================================== */

function formatRestaurantHours(hours: unknown) {
if (!hours) {
return "Hours not configured";
}

if (typeof hours === "string") {
return hours;
}

if (Array.isArray(hours)) {
return hours.join(" • ");
}

if (typeof hours === "object") {
try {
return Object.entries(hours as Record<string, unknown>)
.map(([day, value]) => {
if (typeof value === "string") {
return `${day}: ${value}`;
}


      return `${day}: ${JSON.stringify(value)}`; 
    }) 
    .join(" • "); 
} catch { 
  return "Hours configured"; 
} 


}

return "Hours configured";
}
