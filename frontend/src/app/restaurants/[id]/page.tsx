"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiMessageCircle,
  FiMapPin,
  FiStar,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiFetch } from "@/lib/api";

type Restaurant = {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  phone?: string | null;
  website?: string | null;
  photos?: string[] | null;
  image?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  is_active?: boolean;
  approved?: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
};

type MenuItem = {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string | null;
  price: number | string;
  category?: string | null;
  image?: string | null;
  image_url?: string | null;
  is_available?: boolean;
};

type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  user?: {
    id: number;
    name: string;
  };
  created_at?: string;
};

type Table = {
  id: number;
  restaurant_id?: number;
  table_number?: number | string;
  capacity?: number;
  seating_type?: string | null;
  status?: string;
};

type AvailabilitySlot = {
  time?: string;
  reservation_time?: string;
  available?: boolean;
  table_id?: number;
  id?: number;
  capacity?: number;
  table_number?: number | string;
  seating_type?: string | null;
  table?: Table;
  tables?: Table[];
};

type Reservation = {
  id: number;
  user_id?: number;
  restaurant_id?: number;
  table_id?: number;
  party_size?: number;
  reservation_date?: string;
  reservation_time?: string;
  status?: string;
};

type ReservationResponse = {
  success?: boolean;
  message?: string;
  data?: Reservation | { data?: Reservation };
};

type Occasion =
  | "birthday"
  | "anniversary"
  | "romantic"
  | "business"
  | "family"
  | "graduation"
  | "jebena"
  | "";

type SeatingPreference =
  | "window"
  | "terrace"
  | "private"
  | "standard"
  | "";

type DietaryPreference =
  | "fasting"
  | "non_fasting"
  | "teff"
  | "dairy_free"
  | "mild"
  | "halal"
  | "";

type PaymentMethod =
  | "telebirr"
  | "cbe"
  | "apollo"
  | "awash"
  | "points";

const OCCASIONS = [
  {
    id: "birthday",
    title: "Birthday Celebration",
    description: "Make their special day memorable",
    icon: "🎂",
  },
  {
    id: "anniversary",
    title: "Anniversary",
    description: "Celebrate another beautiful year",
    icon: "💍",
  },
  {
    id: "romantic",
    title: "Romantic Date",
    description: "A special evening for two",
    icon: "❤️",
  },
  {
    id: "business",
    title: "Business",
    description: "Professional dining and meetings",
    icon: "💼",
  },
  {
    id: "family",
    title: "Family",
    description: "Quality time around the table",
    icon: "👨‍👩‍👧‍👦",
  },
  {
    id: "graduation",
    title: "Graduation",
    description: "Celebrate a big achievement",
    icon: "🎓",
  },
  {
    id: "jebena",
    title: "Jebena Gathering",
    description: "Traditional Ethiopian gathering",
    icon: "☕",
  },
] as const;

const DIETARY_OPTIONS = [
  {
    id: "fasting",
    title: "Ye'tsom",
    description: "Vegan fasting preparation",
  },
  {
    id: "non_fasting",
    title: "Yefisik",
    description: "Non-fasting preparation",
  },
  {
    id: "teff",
    title: "100% Teff Injera",
    description: "Pure teff injera",
  },
  {
    id: "dairy_free",
    title: "Dairy Free",
    description: "No niter kibbeh",
  },
  {
    id: "mild",
    title: "Mild Spice",
    description: "No mitmita",
  },
  {
    id: "halal",
    title: "Halal",
    description: "Halal preparation",
  },
] as const;

function normalizeArray<T>(
  value: T[] | { data: T[] } | undefined
): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.data || [];
}

function getImageUrl(url?: string | null) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return url.startsWith("/") ? url : `/${url}`;
}

function formatPrice(price: number | string) {
  const value = Number(price);

  if (Number.isNaN(value)) {
    return String(price);
  }

  return `$${value.toFixed(2)}`;
}

function formatRating(value?: number | null) {
  if (value === null || value === undefined) {
    return "New";
  }

  return Number(value).toFixed(1);
}

function formatTime(time?: string) {
  if (!time) return "Time unavailable";

  const [hourString, minute = "00"] =
    time.split(":");

  let hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return time;
  }

  const period = hour >= 12 ? "PM" : "AM";

  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }

  return `${hour}:${minute} ${period}`;
}

function formatDate(date?: string) {
  if (!date) return "Date unavailable";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function extractReservation(
  response: ReservationResponse
): Reservation | null {
  const data = response?.data;

  if (!data) return null;

  if (
    typeof data === "object" &&
    "data" in data &&
    data.data
  ) {
    return data.data;
  }

  return data as Reservation;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();

  const restaurantId = params?.id;

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [menuItems, setMenuItems] =
    useState<MenuItem[]>([]);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [menuLoading, setMenuLoading] =
    useState(true);

  const [reviewLoading, setReviewLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * RESERVATION STATE
   * ============================================================
   */

  const [reservationOpen, setReservationOpen] =
    useState(false);

  const [reservationStep, setReservationStep] =
    useState(1);

  const [partySize, setPartySize] =
    useState(2);

  const [reservationDate, setReservationDate] =
    useState(getToday());

  const [reservationTime, setReservationTime] =
    useState("19:00");

  const [availableTimes, setAvailableTimes] =
    useState<string[]>([
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00",
      "20:30",
      "21:00",
    ]);

  const [availableTables, setAvailableTables] =
    useState<Table[]>([]);

  const [selectedTableId, setSelectedTableId] =
    useState<number | null>(null);

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [availabilityError, setAvailabilityError] =
    useState("");

  /*
   * Step 2
   */

  const [occasion, setOccasion] =
    useState<Occasion>("");

  const [celebrantName, setCelebrantName] =
    useState("");

  const [birthdayDessert, setBirthdayDessert] =
    useState(false);

  const [phone, setPhone] =
    useState("");

  const [smsUpdates, setSmsUpdates] =
    useState(true);

  const [telegramUpdates, setTelegramUpdates] =
    useState(false);

  /*
   * Step 3
   */

  const [dietaryPreference, setDietaryPreference] =
    useState<DietaryPreference>("");

  const [specialRequests, setSpecialRequests] =
    useState("");

  const [kitchenNotes, setKitchenNotes] =
    useState("");

  const [coffeeCeremony, setCoffeeCeremony] =
    useState(false);

  const [tejPairing, setTejPairing] =
    useState(false);

  const [seatingPreference, setSeatingPreference] =
    useState<SeatingPreference>("");

  /*
   * Step 4
   */

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("telebirr");

  /*
   * Step 5
   */

  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [bookingError, setBookingError] =
    useState("");

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  /*
   * ============================================================
   * LOAD RESTAURANT
   * ============================================================
   */

  useEffect(() => {
    if (!restaurantId) return;

    async function loadRestaurant() {
      try {
        setLoading(true);
        setError("");

        let loadedRestaurant: Restaurant | null =
          null;

        try {
          const response =
            await apiFetch<any>(
              `/restaurants/${encodeURIComponent(
                String(restaurantId)
              )}`
            );

          const data = response?.data;

          if (
            data &&
            !Array.isArray(data) &&
            !Array.isArray(data.data)
          ) {
            loadedRestaurant = data;
          } else if (
            Array.isArray(data?.data)
          ) {
            loadedRestaurant =
              data.data.find(
                (item: Restaurant) =>
                  String(item.id) ===
                  String(restaurantId)
              ) || null;
          }
        } catch (detailError) {
          console.warn(
            "Restaurant detail request failed.",
            detailError
          );
        }

        if (!loadedRestaurant) {
          const response =
            await apiFetch<any>(
              `/restaurants?per_page=100&page=1`
            );

          const data = response?.data;

          const restaurants: Restaurant[] =
            Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
                ? data.data
                : [];

          loadedRestaurant =
            restaurants.find(
              (item) =>
                String(item.id) ===
                String(restaurantId)
            ) || null;
        }

        if (!loadedRestaurant) {
          throw new Error(
            "Restaurant not found."
          );
        }

        setRestaurant(loadedRestaurant);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load restaurant."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRestaurant();
  }, [restaurantId]);

  /*
   * ============================================================
   * LOAD MENU
   * ============================================================
   */

  useEffect(() => {
    if (!restaurantId) return;

    async function loadMenu() {
      try {
        setMenuLoading(true);

        const response =
          await apiFetch<any>(
            `/restaurants/${restaurantId}/menu`
          );

        setMenuItems(
          normalizeArray(response?.data)
        );
      } catch (err) {
        console.error(
          "Menu error:",
          err
        );
      } finally {
        setMenuLoading(false);
      }
    }

    loadMenu();
  }, [restaurantId]);

  /*
   * ============================================================
   * LOAD REVIEWS
   * ============================================================
   */

  useEffect(() => {
    if (!restaurantId) return;

    async function loadReviews() {
      try {
        setReviewLoading(true);

        const response =
          await apiFetch<any>(
            `/restaurants/${restaurantId}/reviews`
          );

        setReviews(
          normalizeArray(response?.data)
        );
      } catch (err) {
        console.error(
          "Review error:",
          err
        );
      } finally {
        setReviewLoading(false);
      }
    }

    loadReviews();
  }, [restaurantId]);

  /*
   * ============================================================
   * LOAD AVAILABILITY
   *
   * IMPORTANT:
   * We intentionally do NOT depend on selectedTableId.
   * Selecting a table should not trigger another availability
   * request.
   * ============================================================
   */

  useEffect(() => {
    if (
      !restaurantId ||
      !reservationDate ||
      !partySize
    ) {
      return;
    }

    async function loadAvailability() {
      try {
        setAvailabilityLoading(true);
        setAvailabilityError("");

        const query =
          new URLSearchParams({
            date: reservationDate,
            party_size: String(partySize),
          });

        const response =
          await apiFetch<any>(
            `/restaurants/${restaurantId}/availability?${query.toString()}`
          );

        const data = response?.data;

        const rawSlots: AvailabilitySlot[] =
          Array.isArray(data?.slots)
            ? data.slots
            : Array.isArray(data)
              ? data
              : [];

        /*
         * Get available times.
         */
        const times = rawSlots
          .map((slot) => {
            if (typeof slot === "string") {
              return slot;
            }

            return (
              slot?.time ||
              slot?.reservation_time
            );
          })
          .filter(
            (time): time is string =>
              Boolean(time)
          );

        const uniqueTimes = Array.from(
          new Set(times)
        );

        if (uniqueTimes.length > 0) {
          setAvailableTimes(uniqueTimes);

          if (
            !uniqueTimes.includes(
              reservationTime
            )
          ) {
            setReservationTime(
              uniqueTimes[0]
            );
          }
        }

        /*
         * Build table list.
         */
        const tables: Table[] = [];

        rawSlots.forEach((slot) => {
          /*
           * Tables directly returned by API.
           */
          if (
            Array.isArray(slot?.tables)
          ) {
            slot.tables.forEach(
              (table) => {
                if (
                  table.status &&
                  table.status !==
                    "available"
                ) {
                  return;
                }

                if (
                  Number(
                    table.capacity || 0
                  ) < partySize
                ) {
                  return;
                }

                if (
                  !tables.some(
                    (existing) =>
                      existing.id ===
                      table.id
                  )
                ) {
                  tables.push({
                    ...table,
                    status: "available",
                  });
                }
              }
            );
          }

          /*
           * Single table returned on a slot.
           */
          const table =
            slot?.table;

          if (
            table &&
            table.id &&
            Number(
              table.capacity || 0
            ) >= partySize
          ) {
            if (
              !tables.some(
                (existing) =>
                  existing.id ===
                  table.id
              )
            ) {
              tables.push({
                ...table,
                status: "available",
              });
            }
          }

          /*
           * Availability APIs sometimes return
           * table_id directly.
           */
          const tableId =
            slot?.table_id;

          if (tableId) {
            const capacity =
              Number(
                slot?.capacity ||
                  partySize
              );

            if (capacity >= partySize) {
              if (
                !tables.some(
                  (existing) =>
                    existing.id ===
                    Number(tableId)
                )
              ) {
                tables.push({
                  id: Number(tableId),
                  restaurant_id:
                    restaurant?.id,
                  table_number:
                    slot?.table_number,
                  capacity,
                  seating_type:
                    slot?.seating_type ||
                    "standard",
                  status: "available",
                });
              }
            }
          }
        });

        setAvailableTables(tables);

        /*
         * Reset table selection whenever the current
         * selection is no longer valid.
         */
        setSelectedTableId((current) => {
          if (
            current &&
            tables.some(
              (table) =>
                table.id === current
            )
          ) {
            return current;
          }

          return tables[0]?.id || null;
        });
      } catch (err) {
        console.error(
          "Availability error:",
          err
        );

        setAvailableTables([]);
        setSelectedTableId(null);

        setAvailabilityError(
          err instanceof Error
            ? err.message
            : "Unable to load table availability."
        );
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadAvailability();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    restaurantId,
    reservationDate,
    partySize,
  ]);

  /*
   * ============================================================
   * DERIVED DATA
   * ============================================================
   */

  const photos = useMemo(() => {
    if (!restaurant) return [];

    const restaurantPhotos =
      Array.isArray(
        restaurant.photos
      )
        ? restaurant.photos
            .map(getImageUrl)
            .filter(Boolean)
        : [];

    if (restaurantPhotos.length > 0) {
      return restaurantPhotos;
    }

    if (restaurant.image) {
      return [
        getImageUrl(
          restaurant.image
        ),
      ];
    }

    return [];
  }, [restaurant]);

  const featuredMenu = useMemo(
    () =>
      menuItems
        .filter(
          (item) =>
            item.is_available !== false
        )
        .slice(0, 4),
    [menuItems]
  );

  const averageReview = useMemo(() => {
    if (!reviews.length) {
      return restaurant?.rating || null;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum +
        Number(
          review.rating || 0
        ),
      0
    );

    return total / reviews.length;
  }, [reviews, restaurant]);

  const selectedTable = useMemo(
    () =>
      availableTables.find(
        (table) =>
          table.id ===
          selectedTableId
      ),
    [
      availableTables,
      selectedTableId,
    ]
  );

  const depositAmount = 500;

  const coffeeAmount =
    coffeeCeremony ? 350 : 0;

  const totalDeposit =
    depositAmount +
    coffeeAmount;

  /*
   * ============================================================
   * RESERVATION OPEN / CLOSE
   * ============================================================
   */

  function openReservation() {
    if (!restaurant) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(
            "token"
          )
        : null;

    const query =
      new URLSearchParams({
        date: reservationDate,
        time: reservationTime,
        party_size:
          String(partySize),
      });

    const redirect =
      `/restaurants/${restaurant.id}/reserve?${query.toString()}`;

    if (!token) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          redirect
        )}`
      );
      return;
    }

    setBookingError("");
    setReservation(null);
    setReservationStep(1);
    setReservationOpen(true);
  }

  function closeReservation() {
    if (bookingLoading) return;

    setReservationOpen(false);
    setReservationStep(1);
    setBookingError("");
    setReservation(null);
  }

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  function validateCurrentStep() {
    setBookingError("");

    if (reservationStep === 1) {
      if (!reservationDate) {
        setBookingError(
          "Please select a reservation date."
        );
        return false;
      }

      if (!reservationTime) {
        setBookingError(
          "Please select a reservation time."
        );
        return false;
      }

      if (
        availableTimes.length > 0 &&
        !availableTimes.includes(
          reservationTime
        )
      ) {
        setBookingError(
          "The selected time is no longer available. Please choose another time."
        );
        return false;
      }

      if (!selectedTableId) {
        setBookingError(
          "Please select an available table."
        );
        return false;
      }
    }

    if (reservationStep === 2) {
      if (
        occasion === "birthday" &&
        !celebrantName.trim()
      ) {
        setBookingError(
          "Please enter the celebrant's name."
        );
        return false;
      }

      if (
        phone.trim() &&
        phone.trim().length < 7
      ) {
        setBookingError(
          "Please enter a valid Ethiopian phone number."
        );
        return false;
      }
    }

    if (reservationStep === 3) {
      if (
        specialRequests.length >
        500
      ) {
        setBookingError(
          "Special requests must be 500 characters or less."
        );
        return false;
      }

      if (
        kitchenNotes.length >
        500
      ) {
        setBookingError(
          "Kitchen notes must be 500 characters or less."
        );
        return false;
      }
    }

    if (reservationStep === 4) {
      if (!paymentMethod) {
        setBookingError(
          "Please select a payment method."
        );
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (
      !validateCurrentStep()
    ) {
      return;
    }

    if (reservationStep < 5) {
      setReservationStep(
        (step) => step + 1
      );
    }
  }

  function previousStep() {
    setBookingError("");

    if (reservationStep > 1) {
      setReservationStep(
        (step) => step - 1
      );
    }
  }

  /*
   * ============================================================
   * CREATE RESERVATION
   * ============================================================
   */

  async function confirmReservation() {
    if (!restaurant) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(
            "token"
          )
        : null;

    if (!token) {
      const query =
        new URLSearchParams({
          date: reservationDate,
          time: reservationTime,
          party_size:
            String(partySize),
        });

      router.push(
        `/login?redirect=${encodeURIComponent(
          `/restaurants/${restaurant.id}/reserve?${query.toString()}`
        )}`
      );

      return;
    }

    if (!selectedTableId) {
      setBookingError(
        "Please select a table."
      );
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError("");

      /*
       * Final availability check.
       */
      const query =
        new URLSearchParams({
          date: reservationDate,
          time: reservationTime,
          party_size:
            String(partySize),
        });

      const availabilityResponse =
        await apiFetch<any>(
          `/restaurants/${restaurant.id}/availability?${query.toString()}`
        );

      const data =
        availabilityResponse?.data;

      const rawSlots: AvailabilitySlot[] =
        Array.isArray(data?.slots)
          ? data.slots
          : Array.isArray(data)
            ? data
            : [];

      /*
       * If the API gives us table information,
       * make sure our selected table is still present.
       */
      const matchingSlot =
        rawSlots.find(
          (slot) => {
            const slotTime =
              slot?.time ||
              slot?.reservation_time;

            if (
              slotTime !==
              reservationTime
            ) {
              return false;
            }

            if (
              slot?.available === false
            ) {
              return false;
            }

            if (
              Number(
                slot?.table_id
              ) ===
              Number(
                selectedTableId
              )
            ) {
              return true;
            }

            if (
              Number(
                slot?.table?.id
              ) ===
              Number(
                selectedTableId
              )
            ) {
              return true;
            }

            if (
              Array.isArray(
                slot?.tables
              )
            ) {
              return slot.tables.some(
                (table) =>
                  Number(
                    table.id
                  ) ===
                  Number(
                    selectedTableId
                  )
              );
            }

            return false;
          }
        );

      /*
       * Do not reject the booking solely because the
       * availability response has a different structure.
       * The backend itself performs the final table-lock
       * and conflict check.
       */
      if (
        rawSlots.length > 0 &&
        !matchingSlot
      ) {
        const timeSlotExists =
          rawSlots.some(
            (slot) => {
              const slotTime =
                slot?.time ||
                slot?.reservation_time;

              return (
                slotTime ===
                  reservationTime &&
                slot?.available !== false
              );
            }
          );

        if (!timeSlotExists) {
          throw new Error(
            "This reservation time is no longer available. Please choose another time."
          );
        }
      }

      /*
       * Build notes.
       *
       * Your current backend supports `notes` and
       * `special_requests`, so the extra wizard information
       * is stored there until dedicated database columns
       * are added.
       */
      const notes = [
        occasion
          ? `Occasion: ${occasion}`
          : "",

        celebrantName.trim()
          ? `Celebrant: ${celebrantName.trim()}`
          : "",

        birthdayDessert
          ? "Birthday dessert candle requested"
          : "",

        seatingPreference
          ? `Seating preference: ${seatingPreference}`
          : "",

        dietaryPreference
          ? `Dietary preference: ${dietaryPreference}`
          : "",

        coffeeCeremony
          ? "Traditional Ethiopian Buna coffee ceremony requested"
          : "",

        tejPairing
          ? "Chef's amuse-bouche and aged Tej pairing requested"
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const requests = [
        specialRequests.trim(),

        kitchenNotes.trim()
          ? `Kitchen / accessibility: ${kitchenNotes.trim()}`
          : "",

        phone.trim()
          ? `Contact phone: +251 ${phone.trim()}`
          : "",

        smsUpdates
          ? "SMS updates enabled"
          : "SMS updates disabled",

        telegramUpdates
          ? "Telegram concierge enabled"
          : "Telegram concierge disabled",

        `Payment method selected: ${paymentMethod}`,

        `Deposit amount: ${totalDeposit} ETB`,

        /*
         * Important:
         * This is only a selected payment method.
         * It is NOT a completed payment.
         */
        "Payment processing pending backend payment integration.",
      ]
        .filter(Boolean)
        .join(" | ");

      const response =
        await apiFetch<ReservationResponse>(
          "/reservations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              restaurant_id:
                restaurant.id,

              table_id:
                selectedTableId,

              party_size:
                partySize,

              reservation_date:
                reservationDate,

              reservation_time:
                reservationTime,

              notes:
                notes || null,

              special_requests:
                requests || null,
            }),
          }
        );

      const created =
        extractReservation(
          response
        );

      if (!created) {
        throw new Error(
          response?.message ||
            "Reservation was not returned by the server."
        );
      }

      setReservation(created);
      setReservationStep(5);
    } catch (err) {
      console.error(
        "Reservation creation error:",
        err
      );

      setBookingError(
        err instanceof Error
          ? err.message
          : "Unable to create reservation."
      );
    } finally {
      setBookingLoading(false);
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#01261f] border-t-transparent" />

          <p className="text-[#414846]">
            Loading restaurant...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">
            🍽️
          </div>

          <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[#01261f]">
            Restaurant not found
          </h1>

          <p className="mt-3 text-[#414846]">
            {error ||
              "We couldn't find this restaurant."}
          </p>

          <Link
            href="/restaurants"
            className="mt-6 inline-flex rounded-full bg-[#01261f] px-6 py-3 font-semibold text-white"
          >
            Back to restaurants
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * MAIN PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] antialiased">
      <main className="pb-24 md:pt-[88px] md:pb-0">

        {/* HERO */}
        <section className="mx-auto w-full max-w-[1600px] px-5 pb-12 pt-6 md:px-16">
          <div className="grid h-[409px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:h-[614px] md:grid-cols-4 md:grid-rows-2">

            <div className="group relative md:col-span-2 md:row-span-2">
              {photos[0] ? (
                <img
                  src={photos[0]}
                  alt={restaurant.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#e5e2e1]">
                  <span className="text-6xl">
                    🍽️
                  </span>
                </div>
              )}
            </div>

            {[1, 2].map(
              (index) => (
                <div
                  key={index}
                  className="group relative hidden md:block"
                >
                  {photos[index] ? (
                    <img
                      src={photos[index]}
                      alt={`${restaurant.name} dining`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#e5e2e1]" />
                  )}
                </div>
              )
            )}

            <div className="group relative hidden md:col-span-2 md:block">
              {photos[3] ? (
                <img
                  src={photos[3]}
                  alt={`${restaurant.name} interior`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[#e5e2e1]" />
              )}

              {photos.length > 4 && (
                <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold shadow-sm">
                  ▦ View all {photos.length} photos
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-5 md:px-16 lg:grid-cols-12">

          <div className="space-y-12 pb-12 lg:col-span-8">

            {/* HEADER */}
            <section className="border-b border-[#e5e2e1] pb-8">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="font-[var(--font-playfair)] text-4xl font-bold tracking-tight text-[#01261f] md:text-5xl">
                  {restaurant.name}
                </h1>

                {restaurant.approved && (
                  <span
                    title="Verified restaurant"
                    className="text-xl text-[#1d9bf0]"
                  >
                    ✓
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[#414846] md:text-base">
                <div className="flex items-center gap-1">
                  <span className="text-[#cba72f]">
                    ★
                  </span>

                  <span className="font-semibold text-[#1c1b1b]">
                    {formatRating(
                      averageReview
                    )}
                  </span>

                  <span>
                    (
                    {reviews.length ||
                      restaurant.reviews_count ||
                      0}{" "}
                    reviews)
                  </span>
                </div>

                <span>•</span>

                <span>
                  {restaurant.price_range ||
                    "$$"}
                </span>

                <span>•</span>

                <span>
                  {restaurant.cuisine_type ||
                    "Restaurant"}
                </span>

                <span>•</span>

                <span>
                  {restaurant.city ||
                    restaurant.address ||
                    "Addis Ababa"}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Great for Groups",
                  "Authentic Flavors",
                  "Local Favorite",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#717976] px-4 py-2 text-xs font-medium text-[#414846]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* ABOUT */}
            <section>
              <h2 className="mb-4 font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                About
              </h2>

              <p className="text-lg leading-relaxed text-[#414846]">
                {restaurant.description ||
                  `${restaurant.name} offers a memorable dining experience with carefully prepared dishes, welcoming service, and a comfortable atmosphere.`}
              </p>
            </section>

            {/* MENU */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                  Featured Menu
                </h2>

                <Link
                  href={`/restaurants/${restaurant.id}/menu`}
                  className="font-semibold text-[#01261f] hover:underline"
                >
                  View Full Menu
                </Link>
              </div>

              {menuLoading ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {[1, 2].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-80 animate-pulse rounded-xl bg-[#ebe7e7]"
                      />
                    )
                  )}
                </div>
              ) : featuredMenu.length ===
                0 ? (
                <div className="rounded-xl border border-[#e5e2e1] bg-white p-8 text-center">
                  No menu items available yet.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {featuredMenu.map(
                    (item) => {
                      const image =
                        getImageUrl(
                          item.image_url ||
                            item.image
                        );

                      return (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-xl border border-[#e5e2e1] bg-white"
                        >
                          <div className="h-48 bg-[#e5e2e1]">
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  item.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-5xl">
                                🍴
                              </div>
                            )}
                          </div>

                          <div className="p-6">
                            <div className="flex justify-between gap-4">
                              <h3 className="font-[var(--font-playfair)] text-xl font-semibold text-[#01261f]">
                                {item.name}
                              </h3>

                              <span className="font-semibold">
                                {formatPrice(
                                  item.price
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-relaxed text-[#414846]">
                              {item.description ||
                                "A delicious dish prepared with fresh ingredients."}
                            </p>

                            {item.category && (
                              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#717976]">
                                {item.category}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* REVIEWS */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                  Reviews
                </h2>

                <span className="text-sm text-[#414846]">
                  {reviews.length} reviews
                </span>
              </div>

              {reviewLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-28 animate-pulse rounded-xl bg-[#ebe7e7]"
                      />
                    )
                  )}
                </div>
              ) : reviews.length ===
                0 ? (
                <div className="rounded-xl border border-[#e5e2e1] bg-white p-8 text-center">
                  No reviews yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews
                    .slice(0, 5)
                    .map(
                      (review) => (
                        <article
                          key={review.id}
                          className="rounded-xl border border-[#e5e2e1] bg-white p-6"
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold text-[#01261f]">
                                {review.user?.name ||
                                  "Diner"}
                              </p>

                              <div className="mt-1 text-[#cba72f]">
                                {"★".repeat(
                                  Math.max(
                                    0,
                                    Math.min(
                                      5,
                                      Number(
                                        review.rating
                                      )
                                    )
                                  )
                                )}
                              </div>
                            </div>

                            {review.created_at && (
                              <span className="text-xs text-[#717976]">
                                {new Date(
                                  review.created_at
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {review.comment && (
                            <p className="mt-4 text-[#414846]">
                              {review.comment}
                            </p>
                          )}
                        </article>
                      )
                    )}
                </div>
              )}
            </section>

            {/* LOCATION */}
            <section>
              <h2 className="mb-4 font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                Location
              </h2>

              <div className="relative h-[300px] overflow-hidden rounded-xl bg-[#e8e5df]">
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <div className="mb-3 text-4xl">
                      📍
                    </div>

                    <p className="font-semibold text-[#01261f]">
                      {restaurant.address ||
                        restaurant.city ||
                        "Addis Ababa, Ethiopia"}
                    </p>

                    <p className="mt-1 text-sm text-[#414846]">
                      Restaurant location
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* DESKTOP RESERVATION */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-[120px] rounded-2xl border border-[#e5e2e1] bg-white p-6 shadow-sm">

              <h3 className="mb-6 text-center font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
                Make a Reservation
              </h3>

              <div className="space-y-5">

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#414846]">
                    Party Size
                  </label>

                  <select
                    value={partySize}
                    onChange={(e) =>
                      setPartySize(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
                  >
                    {Array.from(
                      { length: 8 },
                      (_, i) => i + 1
                    ).map(
                      (size) => (
                        <option
                          key={size}
                          value={size}
                        >
                          {size}{" "}
                          {size === 1
                            ? "Guest"
                            : "Guests"}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#414846]">
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      reservationDate
                    }
                    min={getToday()}
                    onChange={(e) =>
                      setReservationDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#414846]">
                    Time
                  </label>

                  <select
                    value={
                      reservationTime
                    }
                    onChange={(e) =>
                      setReservationTime(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
                  >
                    {availableTimes.map(
                      (time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {formatTime(
                            time
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {availabilityError && (
                <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                  {availabilityError}
                </div>
              )}

              <button
                type="button"
                onClick={
                  openReservation
                }
                className="mt-6 w-full rounded-xl bg-[#01261f] py-4 text-lg font-semibold text-white transition hover:shadow-lg"
              >
                Book Table
              </button>

              <p className="mt-3 text-center text-xs text-[#717976]">
                🔒 Secure reservation
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* MOBILE BOOK BUTTON */}
      <div className="fixed bottom-[76px] left-0 z-40 w-full px-5 pb-2 lg:hidden">
        <button
          type="button"
          onClick={openReservation}
          className="w-full rounded-xl bg-[#01261f] py-4 font-semibold text-white shadow-lg"
        >
          📅 Book a Table
        </button>
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e2e1] bg-white md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link
            href="/"
            className="text-center text-xs text-[#414846]"
          >
            <div className="text-lg">
              ⌂
            </div>
            Home
          </Link>

          <Link
            href="/restaurants"
            className="text-center text-xs font-bold text-[#01261f]"
          >
            <div className="text-lg">
              ⌕
            </div>
            Search
          </Link>

          <Link
            href="/reservations"
            className="text-center text-xs text-[#414846]"
          >
            <div className="text-lg">
              ▣
            </div>
            Bookings
          </Link>

          <Link
            href="/profile"
            className="text-center text-xs text-[#414846]"
          >
            <div className="text-lg">
              ♙
            </div>
            Profile
          </Link>
        </div>
      </nav>

      {/* FOOTER */}
      <footer className="hidden flex-col items-center gap-8 bg-[#01261f] px-16 py-12 text-white md:flex">
        <div className="font-[var(--font-playfair)] text-4xl font-bold">
          DINEET
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/privacy">
            Privacy Policy
          </Link>

          <Link href="/terms">
            Terms of Service
          </Link>

          <Link href="/partner">
            Partner with Us
          </Link>

          <Link href="/careers">
            Careers
          </Link>

          <Link href="/contact">
            Contact
          </Link>
        </div>

        <div className="text-sm text-white/60">
          © 2026 DINEET. All rights reserved.
        </div>
      </footer>

      {/* ========================================================
          RESERVATION WIZARD
      ======================================================== */}

      {reservationOpen && (
        <ReservationWizard
          restaurant={restaurant}
          step={reservationStep}
          setStep={setReservationStep}
          close={closeReservation}
          previousStep={previousStep}
          nextStep={nextStep}
          partySize={partySize}
          setPartySize={setPartySize}
          reservationDate={
            reservationDate
          }
          setReservationDate={
            setReservationDate
          }
          reservationTime={
            reservationTime
          }
          setReservationTime={
            setReservationTime
          }
          availableTimes={
            availableTimes
          }
          availableTables={
            availableTables
          }
          selectedTableId={
            selectedTableId
          }
          setSelectedTableId={
            setSelectedTableId
          }
          selectedTable={
            selectedTable
          }
          availabilityLoading={
            availabilityLoading
          }
          availabilityError={
            availabilityError
          }
          seatingPreference={
            seatingPreference
          }
          setSeatingPreference={
            setSeatingPreference
          }
          occasion={occasion}
          setOccasion={setOccasion}
          celebrantName={
            celebrantName
          }
          setCelebrantName={
            setCelebrantName
          }
          birthdayDessert={
            birthdayDessert
          }
          setBirthdayDessert={
            setBirthdayDessert
          }
          phone={phone}
          setPhone={setPhone}
          smsUpdates={smsUpdates}
          setSmsUpdates={
            setSmsUpdates
          }
          telegramUpdates={
            telegramUpdates
          }
          setTelegramUpdates={
            setTelegramUpdates
          }
          dietaryPreference={
            dietaryPreference
          }
          setDietaryPreference={
            setDietaryPreference
          }
          specialRequests={
            specialRequests
          }
          setSpecialRequests={
            setSpecialRequests
          }
          kitchenNotes={kitchenNotes}
          setKitchenNotes={
            setKitchenNotes
          }
          coffeeCeremony={
            coffeeCeremony
          }
          setCoffeeCeremony={
            setCoffeeCeremony
          }
          tejPairing={tejPairing}
          setTejPairing={
            setTejPairing
          }
          paymentMethod={
            paymentMethod
          }
          setPaymentMethod={
            setPaymentMethod
          }
          totalDeposit={
            totalDeposit
          }
          reservation={
            reservation
          }
          bookingLoading={
            bookingLoading
          }
          bookingError={
            bookingError
          }
          confirmReservation={
            confirmReservation
          }
          onGoToReservations={() =>
            router.push(
              "/reservations"
            )
          }
        />
      )}
    </div>
  );
}

/*
 * ============================================================
 * RESERVATION WIZARD
 * ============================================================
 */

function ReservationWizard({
  restaurant,
  step,
  setStep,
  close,
  previousStep,
  nextStep,

  partySize,
  setPartySize,

  reservationDate,
  setReservationDate,

  reservationTime,
  setReservationTime,

  availableTimes,
  availableTables,

  selectedTableId,
  setSelectedTableId,
  selectedTable,

  availabilityLoading,
  availabilityError,

  seatingPreference,
  setSeatingPreference,

  occasion,
  setOccasion,

  celebrantName,
  setCelebrantName,

  birthdayDessert,
  setBirthdayDessert,

  phone,
  setPhone,

  smsUpdates,
  setSmsUpdates,

  telegramUpdates,
  setTelegramUpdates,

  dietaryPreference,
  setDietaryPreference,

  specialRequests,
  setSpecialRequests,

  kitchenNotes,
  setKitchenNotes,

  coffeeCeremony,
  setCoffeeCeremony,

  tejPairing,
  setTejPairing,

  paymentMethod,
  setPaymentMethod,

  totalDeposit,

  reservation,

  bookingLoading,
  bookingError,

  confirmReservation,

  onGoToReservations,
}: {
  restaurant: Restaurant;
  step: number;
  setStep: (
    value: number
  ) => void;
  close: () => void;
  previousStep: () => void;
  nextStep: () => void;

  partySize: number;
  setPartySize: (
    value: number
  ) => void;

  reservationDate: string;
  setReservationDate: (
    value: string
  ) => void;

  reservationTime: string;
  setReservationTime: (
    value: string
  ) => void;

  availableTimes: string[];
  availableTables: Table[];

  selectedTableId:
    | number
    | null;

  setSelectedTableId: (
    value: number
  ) => void;

  selectedTable?: Table;

  availabilityLoading: boolean;
  availabilityError: string;

  seatingPreference: SeatingPreference;
  setSeatingPreference: (
    value: SeatingPreference
  ) => void;

  occasion: Occasion;
  setOccasion: (
    value: Occasion
  ) => void;

  celebrantName: string;
  setCelebrantName: (
    value: string
  ) => void;

  birthdayDessert: boolean;
  setBirthdayDessert: (
    value: boolean
  ) => void;

  phone: string;
  setPhone: (
    value: string
  ) => void;

  smsUpdates: boolean;
  setSmsUpdates: (
    value: boolean
  ) => void;

  telegramUpdates: boolean;
  setTelegramUpdates: (
    value: boolean
  ) => void;

  dietaryPreference: DietaryPreference;
  setDietaryPreference: (
    value: DietaryPreference
  ) => void;

  specialRequests: string;
  setSpecialRequests: (
    value: string
  ) => void;

  kitchenNotes: string;
  setKitchenNotes: (
    value: string
  ) => void;

  coffeeCeremony: boolean;
  setCoffeeCeremony: (
    value: boolean
  ) => void;

  tejPairing: boolean;
  setTejPairing: (
    value: boolean
  ) => void;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (
    value: PaymentMethod
  ) => void;

  totalDeposit: number;

  reservation:
    | Reservation
    | null;

  bookingLoading: boolean;
  bookingError: string;

  confirmReservation: () => void;

  onGoToReservations: () => void;
}) {
  const completed =
    step === 5 &&
    Boolean(reservation);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">

      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-3xl bg-[#fcf9f8] shadow-2xl sm:min-h-[calc(100vh-3rem)]">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#e5e2e1] bg-white px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">
            {step > 1 &&
              !completed && (
                <button
                  type="button"
                  onClick={
                    previousStep
                  }
                  className="rounded-full p-2 hover:bg-[#f1eeee]"
                >
                  <FiChevronLeft />
                </button>
              )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b7773c]">
                DINEET
              </p>

              <h2 className="font-[var(--font-playfair)] text-xl font-bold text-[#01261f]">
                {restaurant.name}
              </h2>
            </div>
          </div>

          {!completed && (
            <button
              type="button"
              onClick={close}
              disabled={
                bookingLoading
              }
              className="rounded-full p-2 hover:bg-[#f1eeee]"
            >
              <FiX className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* PROGRESS */}
        {!completed && (
          <div className="border-b border-[#e5e2e1] bg-white px-5 py-4 sm:px-8">
            <div className="flex items-center">

              {[
                "Select Table",
                "Occasion",
                "Requests",
                "Payment",
                "Confirmed",
              ].map(
                (label, index) => {
                  const number =
                    index + 1;

                  return (
                    <div
                      key={label}
                      className="flex flex-1 items-center"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            step >= number
                              ? "bg-[#01261f] text-white"
                              : "bg-[#e8e5df] text-[#717976]"
                          }`}
                        >
                          {step >
                          number ? (
                            <FiCheck />
                          ) : (
                            number
                          )}
                        </div>

                        <span
                          className={`mt-1 hidden text-[10px] font-semibold sm:block ${
                            step >=
                            number
                              ? "text-[#01261f]"
                              : "text-[#717976]"
                          }`}
                        >
                          {label}
                        </span>
                      </div>

                      {number <
                        5 && (
                        <div
                          className={`mx-2 h-px flex-1 ${
                            step >
                            number
                              ? "bg-[#01261f]"
                              : "bg-[#e5e2e1]"
                          }`}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9">

            {step === 1 && (
              <StepOne
                partySize={
                  partySize
                }
                setPartySize={
                  setPartySize
                }
                reservationDate={
                  reservationDate
                }
                setReservationDate={
                  setReservationDate
                }
                reservationTime={
                  reservationTime
                }
                setReservationTime={
                  setReservationTime
                }
                availableTimes={
                  availableTimes
                }
                availableTables={
                  availableTables
                }
                selectedTableId={
                  selectedTableId
                }
                setSelectedTableId={
                  setSelectedTableId
                }
                selectedTable={
                  selectedTable
                }
                availabilityLoading={
                  availabilityLoading
                }
                availabilityError={
                  availabilityError
                }
                seatingPreference={
                  seatingPreference
                }
                setSeatingPreference={
                  setSeatingPreference
                }
              />
            )}

            {step === 2 && (
              <StepTwo
                occasion={occasion}
                setOccasion={
                  setOccasion
                }
                celebrantName={
                  celebrantName
                }
                setCelebrantName={
                  setCelebrantName
                }
                birthdayDessert={
                  birthdayDessert
                }
                setBirthdayDessert={
                  setBirthdayDessert
                }
                phone={phone}
                setPhone={setPhone}
                smsUpdates={
                  smsUpdates
                }
                setSmsUpdates={
                  setSmsUpdates
                }
                telegramUpdates={
                  telegramUpdates
                }
                setTelegramUpdates={
                  setTelegramUpdates
                }
              />
            )}

            {step === 3 && (
              <StepThree
                dietaryPreference={
                  dietaryPreference
                }
                setDietaryPreference={
                  setDietaryPreference
                }
                specialRequests={
                  specialRequests
                }
                setSpecialRequests={
                  setSpecialRequests
                }
                kitchenNotes={
                  kitchenNotes
                }
                setKitchenNotes={
                  setKitchenNotes
                }
                coffeeCeremony={
                  coffeeCeremony
                }
                setCoffeeCeremony={
                  setCoffeeCeremony
                }
                tejPairing={
                  tejPairing
                }
                setTejPairing={
                  setTejPairing
                }
              />
            )}

            {step === 4 && (
              <StepFour
                restaurant={
                  restaurant
                }
                partySize={
                  partySize
                }
                reservationDate={
                  reservationDate
                }
                reservationTime={
                  reservationTime
                }
                selectedTable={
                  selectedTable
                }
                coffeeCeremony={
                  coffeeCeremony
                }
                totalDeposit={
                  totalDeposit
                }
                paymentMethod={
                  paymentMethod
                }
                setPaymentMethod={
                  setPaymentMethod
                }
              />
            )}

            {step === 5 && (
              <StepFive
                restaurant={
                  restaurant
                }
                reservation={
                  reservation
                }
                partySize={
                  partySize
                }
                reservationDate={
                  reservationDate
                }
                reservationTime={
                  reservationTime
                }
                selectedTable={
                  selectedTable
                }
                totalDeposit={
                  totalDeposit
                }
                bookingLoading={
                  bookingLoading
                }
                bookingError={
                  bookingError
                }
                confirmReservation={
                  confirmReservation
                }
                onClose={close}
                onGoToReservations={
                  onGoToReservations
                }
              />
            )}

            {bookingError &&
              !(
                step === 5 &&
                !reservation
              ) && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {bookingError}
                </div>
              )}
          </div>
        </div>

        {/* CONTROLS */}
        {!completed && (
          <div className="border-t border-[#e5e2e1] bg-white px-5 py-4 sm:px-8">
            <div className="mx-auto flex max-w-5xl justify-between gap-4">

              <button
                type="button"
                onClick={
                  step === 1
                    ? close
                    : previousStep
                }
                className="flex items-center gap-2 rounded-xl border border-[#c1c8c4] px-5 py-3 font-semibold text-[#414846]"
              >
                <FiArrowLeft />

                {step === 1
                  ? "Cancel"
                  : "Back"}
              </button>

              {step < 5 && (
                <button
                  type="button"
                  onClick={
                    nextStep
                  }
                  className="flex items-center gap-2 rounded-xl bg-[#01261f] px-6 py-3 font-semibold text-white"
                >
                  Continue
                  <FiArrowRight />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STEP 1
 * ============================================================
 */

function StepOne({
  partySize,
  setPartySize,
  reservationDate,
  setReservationDate,
  reservationTime,
  setReservationTime,
  availableTimes,
  availableTables,
  selectedTableId,
  setSelectedTableId,
  selectedTable,
  availabilityLoading,
  availabilityError,
  seatingPreference,
  setSeatingPreference,
}: {
  partySize: number;
  setPartySize: (
    value: number
  ) => void;

  reservationDate: string;
  setReservationDate: (
    value: string
  ) => void;

  reservationTime: string;
  setReservationTime: (
    value: string
  ) => void;

  availableTimes: string[];
  availableTables: Table[];

  selectedTableId:
    | number
    | null;

  setSelectedTableId: (
    value: number
  ) => void;

  selectedTable?: Table;

  availabilityLoading: boolean;
  availabilityError: string;

  seatingPreference: SeatingPreference;
  setSeatingPreference: (
    value: SeatingPreference
  ) => void;
}) {
  return (
    <div>
      <WizardTitle
        step="1 of 5"
        title="Choose Your Table"
        description="Select your preferred dining atmosphere, date, time, and table."
      />

      <div className="grid gap-4 md:grid-cols-3">

        <FieldCard
          icon={<FiUsers />}
          title="Guests"
        >
          <select
            value={partySize}
            onChange={(e) =>
              setPartySize(
                Number(
                  e.target.value
                )
              )
            }
            className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
          >
            {Array.from(
              { length: 8 },
              (_, i) => i + 1
            ).map(
              (size) => (
                <option
                  key={size}
                  value={size}
                >
                  {size}{" "}
                  {size === 1
                    ? "Guest"
                    : "Guests"}
                </option>
              )
            )}
          </select>
        </FieldCard>

        <FieldCard
          icon={<FiCalendar />}
          title="Date"
        >
          <input
            type="date"
            value={
              reservationDate
            }
            min={getToday()}
            onChange={(e) =>
              setReservationDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
          />
        </FieldCard>

        <FieldCard
          icon={<FiClock />}
          title="Time"
        >
          <select
            value={
              reservationTime
            }
            onChange={(e) =>
              setReservationTime(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
          >
            {availableTimes.map(
              (time) => (
                <option
                  key={time}
                  value={time}
                >
                  {formatTime(
                    time
                  )}
                </option>
              )
            )}
          </select>
        </FieldCard>
      </div>

      <section className="mt-8">
        <h3 className="font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
          Dining Atmosphere
        </h3>

        <p className="mt-1 text-sm text-[#717976]">
          Choose the experience you prefer.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [
              "window",
              "Window View",
              "🪟",
            ],
            [
              "terrace",
              "Terrace & Garden",
              "🌿",
            ],
            [
              "private",
              "Private Mesob",
              "🛖",
            ],
            [
              "standard",
              "Standard",
              "🍽️",
            ],
          ].map(
            ([id, title, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setSeatingPreference(
                    id as SeatingPreference
                  )
                }
                className={`rounded-2xl border p-5 text-left ${
                  seatingPreference ===
                  id
                    ? "border-[#01261f] bg-[#01261f] text-white"
                    : "border-[#e5e2e1] bg-white"
                }`}
              >
                <div className="text-3xl">
                  {icon}
                </div>

                <div className="mt-3 font-semibold">
                  {title}
                </div>
              </button>
            )
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
              Available Tables
            </h3>

            <p className="mt-1 text-sm text-[#717976]">
              {formatDate(
                reservationDate
              )}{" "}
              ·{" "}
              {formatTime(
                reservationTime
              )}
            </p>
          </div>

          {availabilityLoading && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#01261f] border-t-transparent" />
          )}
        </div>

        {availabilityError && (
          <div className="mt-4 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
            {availabilityError}
          </div>
        )}

        {availableTables.length ===
        0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#c1c8c4] bg-white p-8 text-center">
            <div className="text-4xl">
              🪑
            </div>

            <p className="mt-3 font-semibold text-[#01261f]">
              No individual table data available
            </p>

            <p className="mt-2 text-sm text-[#717976]">
              Your selected table will still be
              validated by the backend when you
              confirm the reservation.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableTables.map(
              (table) => {
                const selected =
                  table.id ===
                  selectedTableId;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() =>
                      setSelectedTableId(
                        table.id
                      )
                    }
                    className={`rounded-2xl border p-5 text-left ${
                      selected
                        ? "border-[#01261f] bg-[#01261f] text-white"
                        : "border-[#e5e2e1] bg-white"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="text-3xl">
                        🪑
                      </span>

                      {selected && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#01261f]">
                          <FiCheck />
                        </span>
                      )}
                    </div>

                    <h4 className="mt-5 font-[var(--font-playfair)] text-xl font-semibold">
                      Table{" "}
                      {table.table_number ||
                        table.id}
                    </h4>

                    <p
                      className={`mt-2 text-sm ${
                        selected
                          ? "text-white/70"
                          : "text-[#717976]"
                      }`}
                    >
                      Up to{" "}
                      {table.capacity ||
                        partySize}{" "}
                      guests
                    </p>

                    <p className="mt-1 text-xs capitalize opacity-70">
                      {table.seating_type ||
                        "standard"}{" "}
                      seating
                    </p>
                  </button>
                );
              }
            )}
          </div>
        )}

        {selectedTable && (
          <div className="mt-5 rounded-2xl bg-[#f7efe4] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b7773c]">
              Selected table
            </p>

            <h4 className="mt-1 font-[var(--font-playfair)] text-xl font-bold text-[#01261f]">
              Table{" "}
              {selectedTable.table_number ||
                selectedTable.id}
            </h4>

            <p className="mt-1 text-sm text-[#414846]">
              Capacity:{" "}
              {selectedTable.capacity ||
                partySize}{" "}
              guests
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

/*
 * ============================================================
 * STEP 2
 * ============================================================
 */

function StepTwo({
  occasion,
  setOccasion,
  celebrantName,
  setCelebrantName,
  birthdayDessert,
  setBirthdayDessert,
  phone,
  setPhone,
  smsUpdates,
  setSmsUpdates,
  telegramUpdates,
  setTelegramUpdates,
}: {
  occasion: Occasion;
  setOccasion: (
    value: Occasion
  ) => void;

  celebrantName: string;
  setCelebrantName: (
    value: string
  ) => void;

  birthdayDessert: boolean;
  setBirthdayDessert: (
    value: boolean
  ) => void;

  phone: string;
  setPhone: (
    value: string
  ) => void;

  smsUpdates: boolean;
  setSmsUpdates: (
    value: boolean
  ) => void;

  telegramUpdates: boolean;
  setTelegramUpdates: (
    value: boolean
  ) => void;
}) {
  return (
    <div>
      <WizardTitle
        step="2 of 5"
        title="Make It Personal"
        description="Tell us what you're celebrating so our team can make your visit special."
      />

      <h3 className="mb-4 font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
        What's the occasion?
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {OCCASIONS.map(
          (item) => {
            const selected =
              occasion ===
              item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setOccasion(
                    item.id
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  selected
                    ? "border-[#01261f] bg-[#01261f] text-white"
                    : "border-[#e5e2e1] bg-white"
                }`}
              >
                <div className="text-3xl">
                  {item.icon}
                </div>

                <p className="mt-3 font-semibold">
                  {item.title}
                </p>

                <p className="mt-1 text-xs opacity-70">
                  {item.description}
                </p>
              </button>
            );
          }
        )}
      </div>

      {occasion ===
        "birthday" && (
        <div className="mt-6 rounded-2xl bg-[#f7efe4] p-5">
          <h4 className="font-semibold text-[#01261f]">
            Birthday details
          </h4>

          <input
            value={
              celebrantName
            }
            onChange={(e) =>
              setCelebrantName(
                e.target.value
              )
            }
            placeholder="Celebrant's name"
            className="mt-4 w-full rounded-xl border border-[#c1c8c4] px-4 py-3"
          />

          <label className="mt-4 flex gap-3 text-sm text-[#414846]">
            <input
              type="checkbox"
              checked={
                birthdayDessert
              }
              onChange={(e) =>
                setBirthdayDessert(
                  e.target.checked
                )
              }
            />

            Complimentary birthday dessert candle
          </label>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-[#e5e2e1] bg-white p-5">
        <h3 className="font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
          Guest contact
        </h3>

        <label className="mt-5 block text-sm font-medium">
          Ethiopian phone number
        </label>

        <div className="mt-2 flex">
          <span className="rounded-l-xl border border-r-0 border-[#c1c8c4] bg-[#f5f2f0] px-4 py-3 font-semibold">
            +251
          </span>

          <input
            type="tel"
            value={phone}
            onChange={(e) =>
              setPhone(
                e.target.value
              )
            }
            placeholder="9XX XXX XXX"
            className="w-full rounded-r-xl border border-[#c1c8c4] px-4 py-3"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle
            icon="💬"
            title="SMS updates"
            active={smsUpdates}
            onClick={() =>
              setSmsUpdates(
                !smsUpdates
              )
            }
          />

          <Toggle
            icon={
              <FiMessageCircle />
            }
            title="Telegram concierge"
            active={
              telegramUpdates
            }
            onClick={() =>
              setTelegramUpdates(
                !telegramUpdates
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STEP 3
 * ============================================================
 */

function StepThree({
  dietaryPreference,
  setDietaryPreference,
  specialRequests,
  setSpecialRequests,
  kitchenNotes,
  setKitchenNotes,
  coffeeCeremony,
  setCoffeeCeremony,
  tejPairing,
  setTejPairing,
}: {
  dietaryPreference: DietaryPreference;
  setDietaryPreference: (
    value: DietaryPreference
  ) => void;

  specialRequests: string;
  setSpecialRequests: (
    value: string
  ) => void;

  kitchenNotes: string;
  setKitchenNotes: (
    value: string
  ) => void;

  coffeeCeremony: boolean;
  setCoffeeCeremony: (
    value: boolean
  ) => void;

  tejPairing: boolean;
  setTejPairing: (
    value: boolean
  ) => void;
}) {
  return (
    <div>
      <WizardTitle
        step="3 of 5"
        title="Curate Your Experience"
        description="Share dietary preferences and add thoughtful touches to your dining experience."
      />

      <h3 className="mb-4 font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
        Dietary preferences
      </h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {DIETARY_OPTIONS.map(
          (item) => {
            const selected =
              dietaryPreference ===
              item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setDietaryPreference(
                    selected
                      ? ""
                      : item.id
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  selected
                    ? "border-[#01261f] bg-[#01261f] text-white"
                    : "border-[#e5e2e1] bg-white"
                }`}
              >
                <p className="font-semibold">
                  {item.title}
                </p>

                <p className="mt-1 text-xs opacity-70">
                  {item.description}
                </p>
              </button>
            );
          }
        )}
      </div>

      <h3 className="mt-8 mb-4 font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
        Experience upgrades
      </h3>

      <div className="space-y-3">
        <Upgrade
          icon="☕"
          title="Traditional Ethiopian Buna Ceremony"
          description="A traditional coffee ceremony for your table"
          price="+350 ETB"
          active={
            coffeeCeremony
          }
          onClick={() =>
            setCoffeeCeremony(
              !coffeeCeremony
            )
          }
        />

        <Upgrade
          icon="🍯"
          title="Chef's Amuse-Bouche & Aged Tej Pairing"
          description="A curated chef experience"
          price="Curated"
          active={
            tejPairing
          }
          onClick={() =>
            setTejPairing(
              !tejPairing
            )
          }
        />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <textarea
          value={
            specialRequests
          }
          onChange={(e) =>
            setSpecialRequests(
              e.target.value
            )
          }
          rows={5}
          placeholder="Special requests..."
          className="w-full resize-none rounded-2xl border border-[#c1c8c4] bg-white px-4 py-3"
        />

        <textarea
          value={kitchenNotes}
          onChange={(e) =>
            setKitchenNotes(
              e.target.value
            )
          }
          rows={5}
          placeholder="Kitchen / accessibility guidance..."
          className="w-full resize-none rounded-2xl border border-[#c1c8c4] bg-white px-4 py-3"
        />
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STEP 4
 * ============================================================
 */

function StepFour({
  restaurant,
  partySize,
  reservationDate,
  reservationTime,
  selectedTable,
  coffeeCeremony,
  totalDeposit,
  paymentMethod,
  setPaymentMethod,
}: {
  restaurant: Restaurant;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  selectedTable?: Table;
  coffeeCeremony: boolean;
  totalDeposit: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (
    value: PaymentMethod
  ) => void;
}) {
  const methods = [
    [
      "telebirr",
      "Telebirr",
      "📱",
      "Local mobile payment",
    ],
    [
      "cbe",
      "CBE Birr",
      "🏦",
      "Commercial Bank of Ethiopia",
    ],
    [
      "apollo",
      "Apollo",
      "💳",
      "Bank of Abyssinia",
    ],
    [
      "awash",
      "Awash Birr",
      "🏧",
      "Awash Bank",
    ],
    [
      "points",
      "DINEET Points",
      "⭐",
      "Redeem loyalty points",
    ],
  ] as const;

  return (
    <div>
      <WizardTitle
        step="4 of 5"
        title="Deposit & Payment"
        description="Choose how you intend to secure your reservation."
      />

      <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
        <strong>Payment integration notice:</strong>{" "}
        Your current backend does not yet process payment
        transactions. This selection will be saved with the
        reservation until the payment gateway is connected.
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-4 font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
            Choose payment method
          </h3>

          <div className="space-y-3">
            {methods.map(
              (method) => {
                const [
                  id,
                  title,
                  icon,
                  description,
                ] = method;

                const selected =
                  paymentMethod ===
                  id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        id
                      )}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left ${
                      selected
                        ? "border-[#01261f] bg-[#f2f7f5]"
                        : "border-[#e5e2e1] bg-white"
                    }`}
                  >
                    <span className="text-2xl">
                      {icon}
                    </span>

                    <div className="flex-1">
                      <p className="font-semibold text-[#01261f]">
                        {title}
                      </p>

                      <p className="text-sm text-[#717976]">
                        {description}
                      </p>
                    </div>

                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        selected
                          ? "border-[#01261f] bg-[#01261f]"
                          : "border-[#c1c8c4]"
                      }`}
                    />
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#e5e2e1] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b7773c]">
              Reservation summary
            </p>

            <h3 className="mt-2 font-[var(--font-playfair)] text-2xl font-bold text-[#01261f]">
              {restaurant.name}
            </h3>

            <div className="mt-5 space-y-3 text-sm">
              <SummaryLine
                label="Date"
                value={formatDate(
                  reservationDate
                )}
              />

              <SummaryLine
                label="Time"
                value={formatTime(
                  reservationTime
                )}
              />

              <SummaryLine
                label="Guests"
                value={String(
                  partySize
                )}
              />

              {selectedTable && (
                <SummaryLine
                  label="Table"
                  value={String(
                    selectedTable.table_number ||
                      selectedTable.id
                  )}
                />
              )}
            </div>

            <div className="my-5 border-t border-[#e5e2e1]" />

            <SummaryLine
              label="Reservation deposit"
              value="500 ETB"
            />

            {coffeeCeremony && (
              <SummaryLine
                label="Buna ceremony"
                value="350 ETB"
              />
            )}

            <div className="mt-4 flex justify-between border-t border-[#e5e2e1] pt-4">
              <span className="font-semibold">
                Total deposit
              </span>

              <span className="font-bold text-[#b7773c]">
                {totalDeposit} ETB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STEP 5
 * ============================================================
 */

function StepFive({
  restaurant,
  reservation,
  partySize,
  reservationDate,
  reservationTime,
  selectedTable,
  totalDeposit,
  bookingLoading,
  bookingError,
  confirmReservation,
  onClose,
  onGoToReservations,
}: {
  restaurant: Restaurant;
  reservation:
    | Reservation
    | null;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  selectedTable?: Table;
  totalDeposit: number;
  bookingLoading: boolean;
  bookingError: string;
  confirmReservation: () => void;
  onClose: () => void;
  onGoToReservations: () => void;
}) {
  /*
   * FINAL REVIEW
   */
  if (!reservation) {
    return (
      <div className="mx-auto max-w-3xl">
        <WizardTitle
          step="5 of 5"
          title="Confirm Your Reservation"
          description="Review your reservation and confirm to create it."
        />

        <div className="overflow-hidden rounded-3xl border border-[#d7c3a7] bg-white">
          <div className="bg-[#01261f] px-6 py-8 text-center text-white">
            <div className="text-4xl">
              🍽️
            </div>

            <h3 className="mt-4 font-[var(--font-playfair)] text-3xl font-bold">
              {restaurant.name}
            </h3>

            <p className="mt-2 text-white/70">
              Your table is ready to be secured.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <SummaryItem
              icon={<FiCalendar />}
              label="Date"
              value={formatDate(
                reservationDate
              )}
            />

            <SummaryItem
              icon={<FiClock />}
              label="Time"
              value={formatTime(
                reservationTime
              )}
            />

            <SummaryItem
              icon={<FiUsers />}
              label="Guests"
              value={String(
                partySize
              )}
            />

            <SummaryItem
              icon={<FiStar />}
              label="Table"
              value={`Table ${
                selectedTable?.table_number ||
                selectedTable?.id ||
                "Selected"
              }`}
            />
          </div>

          <div className="border-t border-[#e5e2e1] p-6">
            <div className="flex justify-between">
              <span>
                Deposit
              </span>

              <strong className="text-[#b7773c]">
                {totalDeposit} ETB
              </strong>
            </div>
          </div>

          <div className="border-t border-[#e5e2e1] bg-[#f8f6f3] p-6">
            <button
              type="button"
              onClick={
                confirmReservation
              }
              disabled={
                bookingLoading
              }
              className="w-full rounded-2xl bg-[#01261f] py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              {bookingLoading
                ? "Confirming Reservation..."
                : "Confirm & Reserve Table"}
            </button>

            {bookingError && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {bookingError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
   * CONFIRMED
   */

  const reservationId =
    reservation.id;

  const pin =
    `DIN-${String(
      reservationId
    ).padStart(4, "0")}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#01261f] text-3xl text-white">
          <FiCheck />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#b7773c]">
          Reservation confirmed
        </p>

        <h2 className="mt-2 font-[var(--font-playfair)] text-4xl font-bold text-[#01261f]">
          You're all set!
        </h2>

        <p className="mt-3 text-[#414846]">
          Your table at{" "}
          {restaurant.name} has been reserved successfully.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[#d7c3a7] bg-white shadow-xl">

        <div className="bg-[#01261f] px-6 py-8 text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7c3a7]">
            DINEET
          </p>

          <h3 className="mt-2 font-[var(--font-playfair)] text-3xl font-bold">
            Mesob Digital Pass
          </h3>

          <span className="mt-3 inline-block rounded-full border border-white/20 px-3 py-1 text-xs">
            Confirmed
          </span>
        </div>

        <div className="p-6 sm:p-10">
          <h4 className="font-[var(--font-playfair)] text-3xl font-bold text-[#01261f]">
            {restaurant.name}
          </h4>

          <p className="mt-2 flex items-center gap-2 text-sm text-[#717976]">
            <FiMapPin />

            {restaurant.address ||
              restaurant.city ||
              "Addis Ababa, Ethiopia"}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SummaryItem
              icon={<FiCalendar />}
              label="Date"
              value={formatDate(
                reservation.reservation_date ||
                  reservationDate
              )}
            />

            <SummaryItem
              icon={<FiClock />}
              label="Time"
              value={formatTime(
                reservation.reservation_time ||
                  reservationTime
              )}
            />

            <SummaryItem
              icon={<FiUsers />}
              label="Guests"
              value={String(
                reservation.party_size ||
                  partySize
              )}
            />

            <SummaryItem
              icon={<FiStar />}
              label="Table"
              value={`Table ${
                selectedTable?.table_number ||
                reservation.table_id ||
                "Reserved"
              }`}
            />
          </div>

          <div className="my-8 border-t border-dashed border-[#c1c8c4]" />

          <div className="flex flex-col items-center rounded-2xl bg-[#f7efe4] p-6">
            <div className="grid h-36 w-36 grid-cols-7 gap-1 rounded-xl border-4 border-[#01261f] bg-white p-2">
              {Array.from({
                length: 49,
              }).map(
                (_, index) => {
                  const value =
                    (index * 17 +
                      reservationId) %
                    5;

                  return (
                    <div
                      key={index}
                      className={
                        value % 2 ===
                        0
                          ? "bg-[#01261f]"
                          : ""
                      }
                    />
                  );
                }
              )}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#717976]">
              Host check-in PIN
            </p>

            <p className="mt-1 font-mono text-xl font-bold tracking-widest text-[#01261f]">
              {pin}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f2f7f5] p-5">
            <p className="font-semibold text-[#01261f]">
              ⭐ +100 DINEET Points
            </p>

            <p className="mt-1 text-sm text-[#717976]">
              Loyalty points will be credited to your diner passport.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                alert(
                  "Wallet integration will be connected here."
                )
              }
              className="rounded-xl border border-[#c1c8c4] px-4 py-3 font-semibold"
            >
              📱 Add to Wallet
            </button>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Calendar integration will be connected here."
                )
              }
              className="rounded-xl border border-[#c1c8c4] px-4 py-3 font-semibold"
            >
              📅 Add to Calendar
            </button>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Directions integration will be connected here."
                )
              }
              className="rounded-xl border border-[#c1c8c4] px-4 py-3 font-semibold"
            >
              📍 Get Directions
            </button>

            {restaurant.phone ? (
              <a
                href={`tel:${restaurant.phone}`}
                className="rounded-xl border border-[#c1c8c4] px-4 py-3 text-center font-semibold"
              >
                📞 Call Host
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  alert(
                    "Restaurant phone number is not available."
                  )
                }
                className="rounded-xl border border-[#c1c8c4] px-4 py-3 font-semibold"
              >
                📞 Call Host
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={
                onGoToReservations
              }
              className="rounded-xl bg-[#01261f] px-4 py-3 font-semibold text-white"
            >
              View My Reservations
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#c1c8c4] px-4 py-3 font-semibold"
            >
              Back to Restaurant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function WizardTitle({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b7773c]">
        Step {step}
      </p>

      <h2 className="font-[var(--font-playfair)] text-3xl font-bold text-[#01261f] sm:text-4xl">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-[#414846]">
        {description}
      </p>
    </div>
  );
}

function FieldCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e2e1] bg-white p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-[#01261f]">
        {icon}
        {title}
      </div>

      {children}
    </div>
  );
}

function Toggle({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border p-4 text-left ${
        active
          ? "border-[#01261f] bg-[#f2f7f5]"
          : "border-[#e5e2e1]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">
          {icon}
        </span>

        <span className="font-semibold text-[#01261f]">
          {title}
        </span>
      </div>

      <span
        className={`h-5 w-9 rounded-full p-0.5 ${
          active
            ? "bg-[#01261f]"
            : "bg-[#c1c8c4]"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            active
              ? "translate-x-4"
              : ""
          }`}
        />
      </span>
    </button>
  );
}

function Upgrade({
  icon,
  title,
  description,
  price,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  price: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left ${
        active
          ? "border-[#01261f] bg-[#f2f7f5]"
          : "border-[#e5e2e1] bg-white"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">
          {icon}
        </span>

        <div>
          <p className="font-semibold text-[#01261f]">
            {title}
          </p>

          <p className="mt-1 text-sm text-[#717976]">
            {description}
          </p>
        </div>
      </div>

      <span className="font-semibold text-[#b7773c]">
        {price}
      </span>
    </button>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#717976]">
        {label}
      </span>

      <span className="text-right font-semibold text-[#01261f]">
        {value}
      </span>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f8f6f3] p-4">
      <div className="flex items-center gap-2 text-[#b7773c]">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide text-[#717976]">
          {label}
        </span>
      </div>

      <p className="mt-2 font-semibold text-[#01261f]">
        {value}
      </p>
    </div>
  );
}