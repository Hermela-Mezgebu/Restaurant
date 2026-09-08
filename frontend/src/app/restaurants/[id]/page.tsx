"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

type RestaurantResponse = {
  success?: boolean;
  data: Restaurant;
};

type MenuResponse = {
  success?: boolean;
  data: MenuItem[] | {
    data: MenuItem[];
  };
};

type ReviewResponse = {
  success?: boolean;
  data: Review[] | {
    data: Review[];
  };
};

function normalizeArray<T>(value: T[] | { data: T[] } | undefined): T[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  return value.data || [];
}

function getImageUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
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

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();

  const restaurantId = params?.id;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);

  const [error, setError] = useState("");

  const [partySize, setPartySize] = useState(2);

  const [reservationDate, setReservationDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  const [reservationTime, setReservationTime] = useState("19:00");

  const [availableTimes, setAvailableTimes] = useState<string[]>([
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
  ]);

  const [selectedImage, setSelectedImage] = useState(0);

  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    async function loadRestaurant() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<RestaurantResponse>(
          `/restaurants/${restaurantId}`
        );

        setRestaurant(response.data);
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

  useEffect(() => {
    if (!restaurantId) return;

    async function loadMenu() {
      try {
        setMenuLoading(true);

        const response = await apiFetch<MenuResponse>(
          `/restaurants/${restaurantId}/menu`
        );

        setMenuItems(normalizeArray(response.data));
      } catch (err) {
        console.error("Menu error:", err);
      } finally {
        setMenuLoading(false);
      }
    }

    loadMenu();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    async function loadReviews() {
      try {
        setReviewLoading(true);

        const response = await apiFetch<ReviewResponse>(
          `/restaurants/${restaurantId}/reviews`
        );

        setReviews(normalizeArray(response.data));
      } catch (err) {
        console.error("Review error:", err);
      } finally {
        setReviewLoading(false);
      }
    }

    loadReviews();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !reservationDate || !partySize) return;

    async function loadAvailability() {
      try {
        const query = new URLSearchParams({
          date: reservationDate,
          party_size: String(partySize),
        });

        const response = await apiFetch<any>(
          `/restaurants/${restaurantId}/availability?${query.toString()}`
        );

        const data = response?.data;

        if (Array.isArray(data)) {
          const times = data
            .map((item: any) => {
              if (typeof item === "string") return item;

              return item.time || item.reservation_time;
            })
            .filter(Boolean);

          if (times.length > 0) {
            setAvailableTimes(times);
          }
        }
      } catch (err) {
        console.error("Availability error:", err);

        // Keep default times if the backend availability
        // response has a different shape.
      }
    }

    loadAvailability();
  }, [restaurantId, reservationDate, partySize]);

  const photos = useMemo(() => {
    if (!restaurant) return [];

    const restaurantPhotos = Array.isArray(restaurant.photos)
      ? restaurant.photos
          .map(getImageUrl)
          .filter(Boolean)
      : [];

    if (restaurantPhotos.length > 0) {
      return restaurantPhotos;
    }

    if (restaurant.image) {
      return [getImageUrl(restaurant.image)];
    }

    return [];
  }, [restaurant]);

  const featuredMenu = useMemo(() => {
    return menuItems
      .filter((item) => item.is_available !== false)
      .slice(0, 4);
  }, [menuItems]);

  const averageReview = useMemo(() => {
    if (!reviews.length) {
      return restaurant?.rating || null;
    }

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews, restaurant]);

  async function handleBooking() {
    if (!restaurant) return;

    try {
      setBookingLoading(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      if (!token) {
        router.push(
          `/login?redirect=/restaurants/${restaurant.id}`
        );
        return;
      }

      const availabilityResponse = await apiFetch<any>(
        `/restaurants/${restaurant.id}/availability?date=${reservationDate}&time=${reservationTime}&party_size=${partySize}`
      );

      const availableTable =
        availabilityResponse?.data?.available_tables?.[0] ||
        availabilityResponse?.data?.tables?.[0] ||
        availabilityResponse?.data?.[0];

      if (!availableTable) {
        alert(
          "No table is available for this date, time, and party size."
        );
        return;
      }

      const tableId =
        typeof availableTable === "number"
          ? availableTable
          : availableTable.id || availableTable.table_id;

      if (!tableId) {
        alert(
          "No available table was returned by the server."
        );
        return;
      }

      await apiFetch("/reservations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          table_id: tableId,
          party_size: partySize,
          reservation_date: reservationDate,
          reservation_time: reservationTime,
          notes: "",
          special_requests: "",
        }),
      });

      alert("Reservation created successfully!");

      router.push("/reservations");
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to create reservation."
      );
    } finally {
      setBookingLoading(false);
    }
  }

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

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">🍽️</div>

          <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[#01261f]">
            Restaurant not found
          </h1>

          <p className="mt-3 text-[#414846]">
            {error || "We couldn't find this restaurant."}
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

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] antialiased">
      {/* =========================
          DESKTOP NAVBAR
      ========================== */}

      <nav className="fixed left-0 right-0 top-0 z-50 hidden bg-[#fcf9f8]/85 shadow-sm backdrop-blur-md md:flex">
        <div className="flex w-full items-center justify-between px-16 py-4">
          <Link
            href="/"
            className="font-[var(--font-playfair)] text-4xl font-bold tracking-tight text-[#01261f]"
          >
            DINEET
          </Link>

          <div className="flex items-center gap-8 text-base">
            <Link
              href="/restaurants"
              className="text-[#414846] transition hover:text-[#01261f]"
            >
              Explore
            </Link>

            <Link
              href="/reservations"
              className="border-b-2 border-[#01261f] font-bold text-[#01261f]"
            >
              Reservations
            </Link>

            <Link
              href="/menus"
              className="text-[#414846] transition hover:text-[#01261f]"
            >
              Menus
            </Link>

            <Link
              href="/about"
              className="text-[#414846] transition hover:text-[#01261f]"
            >
              About
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-full bg-[#01261f] px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main className="pb-24 md:pt-[88px] md:pb-0">

        {/* =========================
            HERO GALLERY
        ========================== */}

        <section className="mx-auto w-full max-w-[1600px] px-5 pb-12 pt-6 md:px-16">
          <div className="grid h-[409px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:h-[614px] md:grid-cols-4 md:grid-rows-2">

            {/* Main image */}
            <div className="group relative cursor-pointer md:col-span-2 md:row-span-2">
              {photos[0] ? (
                <img
                  src={photos[0]}
                  alt={restaurant.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#e5e2e1]">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Image 2 */}
            <div className="group relative hidden cursor-pointer md:block">
              {photos[1] ? (
                <img
                  src={photos[1]}
                  alt={`${restaurant.name} dining`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-[#e5e2e1]" />
              )}
            </div>

            {/* Image 3 */}
            <div className="group relative hidden cursor-pointer md:block">
              {photos[2] ? (
                <img
                  src={photos[2]}
                  alt={`${restaurant.name} food`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-[#e5e2e1]" />
              )}
            </div>

            {/* Image 4 */}
            <div className="group relative hidden cursor-pointer md:col-span-2 md:block">
              {photos[3] ? (
                <img
                  src={photos[3]}
                  alt={`${restaurant.name} interior`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-[#e5e2e1]" />
              )}

              {photos.length > 4 && (
                <button
                  type="button"
                  onClick={() => setSelectedImage(4)}
                  className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <span>▦</span>
                  View all {photos.length} photos
                </button>
              )}
            </div>
          </div>

          {/* Small mobile gallery */}
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
              {photos.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg ${
                    selectedImage === index
                      ? "ring-2 ring-[#01261f]"
                      : ""
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* =========================
            MAIN CONTENT
        ========================== */}

        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-5 md:px-16 lg:grid-cols-12 lg:gap-8">

          {/* =====================
              LEFT
          ====================== */}

          <div className="space-y-12 pb-12 lg:col-span-8">

            {/* Restaurant Header */}
            <section className="border-b border-[#e5e2e1] pb-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h1 className="font-[var(--font-playfair)] text-4xl font-bold tracking-tight text-[#01261f] md:text-5xl">
                      {restaurant.name}
                    </h1>

                    {restaurant.approved && (
                      <span
                        className="text-xl text-[#1d9bf0]"
                        title="Verified restaurant"
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#414846] md:gap-4 md:text-base">

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <span className="text-[#cba72f]">★</span>

                      <span className="font-semibold text-[#1c1b1b]">
                        {formatRating(averageReview)}
                      </span>

                      <span>
                        ({reviews.length || restaurant.reviews_count || 0} reviews)
                      </span>
                    </div>

                    <span className="h-1 w-1 rounded-full bg-[#c1c8c4]" />

                    {/* Price */}
                    <span>
                      {restaurant.price_range || "$$"}
                    </span>

                    <span className="h-1 w-1 rounded-full bg-[#c1c8c4]" />

                    {/* Cuisine */}
                    <span>
                      {restaurant.cuisine_type || "Restaurant"}
                    </span>

                    <span className="h-1 w-1 rounded-full bg-[#c1c8c4]" />

                    {/* Location */}
                    <span>
                      {restaurant.city ||
                        restaurant.address ||
                        "Addis Ababa"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#717976] px-4 py-2 text-xs font-medium text-[#414846]">
                  Great for Groups
                </span>

                <span className="rounded-full border border-[#717976] px-4 py-2 text-xs font-medium text-[#414846]">
                  Authentic Flavors
                </span>

                <span className="rounded-full border border-[#717976] px-4 py-2 text-xs font-medium text-[#414846]">
                  Local Favorite
                </span>
              </div>
            </section>

            {/* =====================
                ABOUT
            ====================== */}

            <section>
              <h2 className="mb-4 font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                About
              </h2>

              <p className="text-lg leading-relaxed text-[#414846]">
                {restaurant.description ||
                  `${restaurant.name} offers a memorable dining experience with carefully prepared dishes, welcoming service, and a comfortable atmosphere.`}
              </p>
            </section>

            {/* =====================
                FEATURED MENU
            ====================== */}

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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-80 animate-pulse rounded-xl bg-[#ebe7e7]"
                    />
                  ))}
                </div>
              ) : featuredMenu.length === 0 ? (
                <div className="rounded-xl border border-[#e5e2e1] bg-white p-8 text-center">
                  <p className="text-[#414846]">
                    No menu items available yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {featuredMenu.map((item) => {
                    const image = getImageUrl(
                      item.image_url || item.image
                    );

                    return (
                      <div
                        key={item.id}
                        className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e2e1] bg-white transition hover:shadow-md"
                      >
                        <div className="h-48 overflow-hidden bg-[#e5e2e1]">
                          {image ? (
                            <img
                              src={image}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <span className="text-5xl">
                                🍴
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-grow flex-col justify-between p-6">
                          <div>
                            <div className="mb-2 flex items-start justify-between gap-4">
                              <h3 className="font-[var(--font-playfair)] text-xl font-semibold text-[#01261f]">
                                {item.name}
                              </h3>

                              <span className="shrink-0 font-semibold text-[#1c1b1b]">
                                {formatPrice(item.price)}
                              </span>
                            </div>

                            <p className="line-clamp-2 text-sm leading-relaxed text-[#414846]">
                              {item.description ||
                                "A delicious dish prepared with fresh ingredients."}
                            </p>
                          </div>

                          {item.category && (
                            <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#717976]">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* =====================
                REVIEWS
            ====================== */}

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
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-28 animate-pulse rounded-xl bg-[#ebe7e7]"
                    />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-[#e5e2e1] bg-white p-8 text-center">
                  <p className="text-[#414846]">
                    No reviews yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-[#e5e2e1] bg-white p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#01261f]">
                            {review.user?.name || "Diner"}
                          </p>

                          <div className="mt-1 flex gap-1 text-[#cba72f]">
                            {"★".repeat(
                              Math.max(
                                0,
                                Math.min(5, Number(review.rating))
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
                        <p className="mt-4 leading-relaxed text-[#414846]">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* =====================
                LOCATION
            ====================== */}

            <section>
              <h2 className="mb-4 font-[var(--font-playfair)] text-3xl font-semibold text-[#01261f]">
                Location
              </h2>

              <div className="relative h-[300px] overflow-hidden rounded-xl border border-[#e5e2e1] bg-[#ebe7e7]">

                {/* Placeholder until map integration */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#e8e5df]">
                  <div className="text-center">
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

                <div className="absolute bottom-4 left-4 max-w-sm rounded-lg border border-[#e5e2e1] bg-white px-4 py-3 shadow-md">
                  <div className="mb-1 font-semibold text-[#1c1b1b]">
                    {restaurant.name}
                  </div>

                  <div className="text-sm text-[#414846]">
                    {restaurant.address ||
                      restaurant.city ||
                      "Addis Ababa, Ethiopia"}
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* =========================
              RESERVATION WIDGET
          ========================== */}

          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-[120px] overflow-hidden rounded-2xl border border-[#e5e2e1] bg-white p-6 shadow-[0_10px_30px_rgba(1,38,31,0.04)]">

              <div className="relative z-10">

                <h3 className="mb-6 text-center font-[var(--font-playfair)] text-2xl font-semibold text-[#01261f]">
                  Make a Reservation
                </h3>

                <div className="space-y-5">

                  {/* Party Size */}
                  <div className="border-b border-[#c1c8c4] pb-2">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#414846]">
                      Party Size
                    </label>

                    <select
                      value={partySize}
                      onChange={(event) =>
                        setPartySize(
                          Number(event.target.value)
                        )
                      }
                      className="w-full border-0 bg-transparent p-0 text-lg text-[#1c1b1b] outline-none focus:ring-0"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(
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

                  {/* Date */}
                  <div className="border-b border-[#c1c8c4] pb-2">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#414846]">
                      Date
                    </label>

                    <input
                      type="date"
                      value={reservationDate}
                      min={
                        new Date()
                          .toISOString()
                          .split("T")[0]
                      }
                      onChange={(event) =>
                        setReservationDate(
                          event.target.value
                        )
                      }
                      className="w-full border-0 bg-transparent p-0 text-lg text-[#1c1b1b] outline-none focus:ring-0"
                    />
                  </div>

                  {/* Time */}
                  <div className="border-b border-[#c1c8c4] pb-2">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#414846]">
                      Time
                    </label>

                    <select
                      value={reservationTime}
                      onChange={(event) =>
                        setReservationTime(
                          event.target.value
                        )
                      }
                      className="w-full border-0 bg-transparent p-0 text-lg text-[#1c1b1b] outline-none focus:ring-0"
                    >
                      {availableTimes.map((time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {formatTime(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#e5e2e1] pt-6">

                  <p className="mb-4 text-center text-sm text-[#414846]">
                    Select a time to book
                  </p>

                  <div className="mb-6 grid grid-cols-3 gap-2">
                    {availableTimes
                      .slice(0, 3)
                      .map((time) => {
                        const selected =
                          reservationTime === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() =>
                              setReservationTime(time)
                            }
                            className={`rounded-lg border py-2 text-sm font-semibold transition ${
                              selected
                                ? "border-[#01261f] bg-[#01261f] text-white shadow-md"
                                : "border-[#01261f] text-[#01261f] hover:bg-[#01261f] hover:text-white"
                            }`}
                          >
                            {formatTime(time)}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full rounded-xl bg-[#01261f] py-4 text-lg font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bookingLoading
                      ? "Booking..."
                      : "Book Table"}
                  </button>

                  <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-[#414846]">
                    🔒 Secure reservation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================
          MOBILE BOOKING BUTTON
      ========================== */}

      <div className="fixed bottom-[76px] left-0 z-40 w-full px-5 pb-2 lg:hidden">
        <button
          type="button"
          onClick={() => {
            const element =
              document.getElementById(
                "mobile-reservation"
              );

            element?.scrollIntoView({
              behavior: "smooth",
            });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#01261f] py-4 font-semibold text-white shadow-lg"
        >
          📅 Find a Table
        </button>
      </div>

      {/* =========================
          MOBILE RESERVATION
      ========================== */}

      <section
        id="mobile-reservation"
        className="px-5 pb-10 lg:hidden"
      >
        <div className="rounded-2xl border border-[#e5e2e1] bg-white p-6 shadow-sm">
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
                onChange={(event) =>
                  setPartySize(
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-lg border border-[#c1c8c4] px-4 py-3"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(
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
                value={reservationDate}
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                onChange={(event) =>
                  setReservationDate(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-[#c1c8c4] px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#414846]">
                Time
              </label>

              <select
                value={reservationTime}
                onChange={(event) =>
                  setReservationTime(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-[#c1c8c4] px-4 py-3"
              >
                {availableTimes.map((time) => (
                  <option
                    key={time}
                    value={time}
                  >
                    {formatTime(time)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleBooking}
              disabled={bookingLoading}
              className="w-full rounded-xl bg-[#01261f] py-4 font-semibold text-white disabled:opacity-60"
            >
              {bookingLoading
                ? "Booking..."
                : "Book Table"}
            </button>
          </div>
        </div>
      </section>

      {/* =========================
          MOBILE BOTTOM NAV
      ========================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl border-t border-[#e5e2e1] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:hidden">
        <div className="flex h-16 items-center justify-around px-2">

          <Link
            href="/"
            className="flex flex-col items-center justify-center p-2 text-[#414846]"
          >
            <span className="mb-1 text-lg">⌂</span>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/restaurants"
            className="flex flex-col items-center justify-center p-2 font-bold text-[#01261f]"
          >
            <span className="mb-1 text-lg">⌕</span>
            <span className="text-xs">Search</span>
          </Link>

          <Link
            href="/reservations"
            className="flex flex-col items-center justify-center p-2 text-[#414846]"
          >
            <span className="mb-1 text-lg">▣</span>
            <span className="text-xs">Bookings</span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center p-2 text-[#414846]"
          >
            <span className="mb-1 text-lg">♙</span>
            <span className="text-xs">Profile</span>
          </Link>

        </div>
      </nav>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="hidden w-full flex-col items-center gap-8 bg-[#01261f] px-16 py-12 text-white md:flex">

        <div className="font-[var(--font-playfair)] text-4xl font-bold">
          DINEET
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link
            href="/privacy"
            className="text-white/80 transition hover:text-white hover:underline"
          >
            Privacy Policy
          </Link>

          <Link
            href="/terms"
            className="text-white/80 transition hover:text-white hover:underline"
          >
            Terms of Service
          </Link>

          <Link
            href="/partner"
            className="text-white/80 transition hover:text-white hover:underline"
          >
            Partner with Us
          </Link>

          <Link
            href="/careers"
            className="text-white/80 transition hover:text-white hover:underline"
          >
            Careers
          </Link>

          <Link
            href="/contact"
            className="text-white/80 transition hover:text-white hover:underline"
          >
            Contact
          </Link>
        </div>

        <div className="text-sm text-white/60">
          © 2026 DINEET. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function formatTime(time: string) {
  const [hourString, minute] = time.split(":");

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