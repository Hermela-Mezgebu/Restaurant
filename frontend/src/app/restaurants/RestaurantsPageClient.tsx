'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useSearchParams,
  useRouter,
} from 'next/navigation';

import Link from 'next/link';
import { apiFetch } from '@/lib/api';

import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiSearch,
  FiSliders,
  FiStar,
  FiX,
} from 'react-icons/fi';


// ============================================================
// TYPES
// ============================================================

interface Restaurant {
  id: number;
  name: string;
  description?: string | null;
  cuisine?: string | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  rating?: number | string | null;
  reviews_count?: number | null;
  location?: string | null;
  address?: string | null;
  image?: string | null;
  images?: string[] | null;
  photos?: string[] | null;
  is_active?: boolean;
  approved?: boolean;
}

interface LaravelPagination<T> {
  current_page?: number;
  data?: T[];
  first_page_url?: string;
  from?: number;
  last_page?: number;
  last_page_url?: string;
  links?: any[];
  next_page_url?: string | null;
  path?: string;
  per_page?: number;
  prev_page_url?: string | null;
  to?: number;
  total?: number;
}

interface RestaurantApiResponse {
  data?:
    | LaravelPagination<Restaurant>
    | Restaurant[];
  restaurants?: Restaurant[];
  current_page?: number;
  last_page?: number;
  total?: number;
  total_pages?: number;
}


// ============================================================
// CONSTANTS
// ============================================================

const CUISINES = [
  'Italian',
  'Chinese',
  'Japanese',
  'Mexican',
  'Indian',
  'American',
  'French',
  'Mediterranean',
];

const PRICE_RANGES = [
  {
    value: '$',
    label: '$',
    description: 'Budget',
  },
  {
    value: '$$',
    label: '$$',
    description: 'Moderate',
  },
  {
    value: '$$$',
    label: '$$$',
    description: 'Premium',
  },
  {
    value: '$$$$',
    label: '$$$$',
    description: 'Luxury',
  },
];


// ============================================================
// HELPERS
// ============================================================

function getRestaurantImage(
  restaurant: Restaurant
): string | null {
  if (
    restaurant.photos &&
    restaurant.photos.length > 0
  ) {
    return restaurant.photos[0];
  }

  if (
    restaurant.images &&
    restaurant.images.length > 0
  ) {
    return restaurant.images[0];
  }

  return restaurant.image || null;
}


function getRating(
  restaurant: Restaurant
): number {
  const rating = Number(
    restaurant.rating ?? 0
  );

  if (
    Number.isNaN(rating) ||
    rating < 0
  ) {
    return 0;
  }

  return rating;
}


function getReviewsCount(
  restaurant: Restaurant
): number {
  return Number(
    restaurant.reviews_count ?? 0
  );
}


function getLocation(
  restaurant: Restaurant
): string {
  return (
    restaurant.location ||
    restaurant.address ||
    'Location unavailable'
  );
}


// ============================================================
// SKELETON CARD
// ============================================================

function RestaurantSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white">
      <div className="h-64 animate-pulse bg-[#e5e2e1] dark:bg-[#e5e2e1]" />

      <div className="space-y-4 p-5">
        <div className="h-6 w-3/4 animate-pulse rounded bg-[#e5e2e1] dark:bg-[#e5e2e1]" />

        <div className="h-4 w-1/2 animate-pulse rounded bg-[#e5e2e1] dark:bg-[#e5e2e1]" />

        <div className="h-4 w-2/3 animate-pulse rounded bg-[#e5e2e1] dark:bg-[#e5e2e1]" />

        <div className="h-10 w-full animate-pulse rounded-xl bg-[#e5e2e1] dark:bg-[#e5e2e1]" />
      </div>
    </div>
  );
}


// ============================================================
// RESTAURANT CARD
// ============================================================

function RestaurantGridCard({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const image = getRestaurantImage(
    restaurant
  );

  const rating = getRating(
    restaurant
  );

  const reviews = getReviewsCount(
    restaurant
  );

  return (
    <article className="group overflow-hidden rounded-[24px] border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white transition duration-300 hover:-translate-y-1 hover:border-[#d4c6b7] hover:border-[#e27a4b] hover:shadow-xl hover:shadow-[#01261f]/20 dark:hover:border-[#7a402b] dark:hover:shadow-[#01261f]/20">

      {/* Image */}
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="block"
      >
        <div className="relative h-64 overflow-hidden bg-[#e5e2e1] dark:bg-[#e5e2e1]">

          {image ? (
            <img
              src={image}
              alt={restaurant.name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FiMapPin className="h-10 w-10 text-[#717976] dark:text-[#717976]" />
            </div>
          )}

          {/* Gradient */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Price */}
          {restaurant.price_range && (
            <div className="absolute right-4 top-4 rounded-full bg-white dark:bg-white/95 px-3.5 py-2 text-xs font-bold text-[#01261f] dark:text-[#01261f] shadow-sm backdrop-blur">
              {restaurant.price_range}
            </div>
          )}

          {/* Approved */}
          {restaurant.approved !== false && (
            <div className="absolute bottom-4 left-4 rounded-full bg-white dark:bg-white/95 px-3 py-1.5 text-[11px] font-bold text-[#01261f] dark:text-[#01261f] backdrop-blur">
              Verified
            </div>
          )}
        </div>
      </Link>


      {/* Content */}
      <div className="p-5">

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">

            <Link
              href={`/restaurants/${restaurant.id}`}
              className="block"
            >
              <h2 className="truncate font-serif text-[22px] font-semibold text-[#01261f] dark:text-[#01261f] transition group-hover:text-[#01261f] dark:text-[#717976]">
                {restaurant.name}
              </h2>
            </Link>

            <div className="mt-2 flex items-center gap-2 text-sm text-[#717976] dark:text-[#717976]">

              {(restaurant.cuisine_type || restaurant.cuisine) && (
                <>
                  <span className="truncate">
                    {restaurant.cuisine_type || restaurant.cuisine}
                  </span>

                  <span className="text-[#717976] dark:text-[#717976]">
                    •
                  </span>
                </>
              )}

              <span className="flex shrink-0 items-center gap-1 font-semibold text-[#01261f] dark:text-[#01261f]">
                <FiStar className="h-4 w-4 fill-current text-[#01261f]" />

                {rating > 0
                  ? rating.toFixed(1)
                  : 'New'}
              </span>

            </div>

          </div>

        </div>


        {/* Location */}
        <div className="mt-4 flex items-center gap-2 text-sm text-[#717976] dark:text-[#717976]">

          <FiMapPin className="h-4 w-4 shrink-0 text-[#717976] dark:text-[#717976]" />

          <span className="truncate">
            {getLocation(restaurant)}
          </span>

        </div>


        {/* Reviews */}
        {reviews > 0 && (
          <p className="mt-1 pl-6 text-xs text-[#717976] dark:text-[#717976]">
            {reviews}{' '}
            {reviews === 1
              ? 'review'
              : 'reviews'}
          </p>
        )}


        {/* Button */}
        <Link
          href={`/restaurants/${restaurant.id}`}
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#c1c8c4] dark:border-[#c1c8c4] text-sm font-semibold text-[#01261f] dark:text-[#01261f] transition hover:border-[#01261f] dark:hover:border-[#01261f] hover:bg-[#01261f] dark:hover:bg-[#01261f] hover:text-white"
        >
          View restaurant
          <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>

      </div>

    </article>
  );
}


// ============================================================
// PAGE
// ============================================================

export default function RestaurantsPage() {
  const searchParams =
    useSearchParams();

  const router = useRouter();


  // ----------------------------------------------------------
  // FILTER STATE
  // ----------------------------------------------------------

  const [
    restaurants,
    setRestaurants,
  ] = useState<Restaurant[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get('search') || ''
  );

  const [
    cuisine,
    setCuisine,
  ] = useState(
    searchParams.get('cuisine') || ''
  );

  const [
    priceRange,
    setPriceRange,
  ] = useState(
    searchParams.get('price_range') || ''
  );

  const [
    location,
    setLocation,
  ] = useState(
    searchParams.get('location') || ''
  );

  const [
    page,
    setPage,
  ] = useState(
    Number(
      searchParams.get('page') || 1
    )
  );

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalCount,
    setTotalCount,
  ] = useState(0);

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);


  // ==========================================================
  // FETCH RESTAURANTS
  // ==========================================================

const fetchRestaurants = useCallback(async () => {
  setLoading(true);
  setError('');

  try {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set('search', search.trim());
    }

    if (cuisine) {
      params.set('cuisine', cuisine);
    }

    if (priceRange) {
      params.set('price_range', priceRange);
    }

    if (location.trim()) {
      params.set('location', location.trim());
    }

    params.set('page', String(page));
    params.set('per_page', '12');

    const response = await apiFetch<RestaurantApiResponse>(
      `/restaurants?${params.toString()}`
    );

    const responseData = response?.data;

    // Laravel pagination response
    if (
      responseData &&
      typeof responseData === 'object' &&
      !Array.isArray(responseData) &&
      'data' in responseData
    ) {
      setRestaurants(responseData.data || []);

      setTotalPages(
        responseData.last_page ||
          Math.ceil(
            (responseData.total || 0) /
              (responseData.per_page || 12)
          ) ||
          1
      );

      setTotalCount(responseData.total || 0);
    } else {
      // Fallback if API returns a simple array
      const restaurantsData = Array.isArray(responseData)
        ? responseData
        : [];

      setRestaurants(restaurantsData);
      setTotalPages(1);
      setTotalCount(restaurantsData.length);
    }
  } catch (err) {
    console.error('Failed to fetch restaurants:', err);

    setRestaurants([]);
    setTotalPages(1);
    setTotalCount(0);

    setError(
      err instanceof Error
        ? err.message
        : 'Failed to load restaurants.'
    );
  } finally {
    setLoading(false);
  }
}, [
  search,
  cuisine,
  priceRange,
  location,
  page,
]);


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);


  // ==========================================================
  // RESET PAGE WHEN FILTERS CHANGE
  // ==========================================================

  useEffect(() => {
    setPage(1);
  }, [
    cuisine,
    priceRange,
  ]);


  // ==========================================================
  // UPDATE URL
  // ==========================================================

  useEffect(() => {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        'search',
        search.trim()
      );
    }

    if (cuisine) {
      params.set(
        'cuisine',
        cuisine
      );
    }

    if (priceRange) {
      params.set(
        'price_range',
        priceRange
      );
    }

    if (location.trim()) {
      params.set(
        'location',
        location.trim()
      );
    }

    if (page > 1) {
      params.set(
        'page',
        String(page)
      );
    }

    const query =
      params.toString();

    router.replace(
      query
        ? `/restaurants?${query}`
        : '/restaurants',
      {
        scroll: false,
      }
    );
  }, [
    search,
    cuisine,
    priceRange,
    location,
    page,
    router,
  ]);


  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSearch('');
    setCuisine('');
    setPriceRange('');
    setLocation('');
    setPage(1);
  };


  const hasActiveFilters =
    Boolean(
      search ||
      cuisine ||
      priceRange ||
      location
    );


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const paginationPages =
    Array.from(
      {
        length: Math.min(
          totalPages,
          7
        ),
      },
      (_, index) => {
        if (totalPages <= 7) {
          return index + 1;
        }

        if (page <= 4) {
          return index + 1;
        }

        if (
          page >=
          totalPages - 3
        ) {
          return (
            totalPages - 6 + index
          );
        }

        return page - 3 + index;
      }
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f0edec] text-[#01261f] transition-colors dark:bg-[#f0edec] dark:text-[#01261f]">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="border-b border-[#c1c8c4] bg-[#f0edec] dark:border-[#c1c8c4] dark:bg-[#f0edec]">

        <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">

          <div className="max-w-3xl">

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#717976] dark:text-[#717976]">
              Discover your next table
            </p>

            <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[#01261f] dark:text-[#01261f] sm:text-6xl">
              Explore restaurants
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#717976] dark:text-[#717976] sm:text-lg">
              Discover restaurants, explore their menus,
              and reserve the perfect table for your next meal.
            </p>

          </div>


          {/* Search */}
          <div className="mt-9 max-w-3xl">

            <div className="relative">

              <FiSearch className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#717976] dark:text-[#717976]" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search restaurants..."
                className="h-14 w-full rounded-2xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white pl-14 pr-5 text-sm text-[#01261f] dark:text-[#01261f] shadow-sm outline-none transition placeholder:text-[#717976] dark:text-[#717976] focus:border-[#01261f] focus:ring-4 focus:ring-[#01261f]/20"
              />

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10">


          {/* =================================================
              FILTER SIDEBAR
          ================================================== */}

          <aside
            className={`${
              showFilters
                ? 'block'
                : 'hidden'
            } mb-8 lg:block`}
          >

            <div className="sticky top-28 rounded-2xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white p-5">

              <div className="flex items-center justify-between">

                <h2 className="font-serif text-xl font-semibold">
                  Filters
                </h2>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#717976] dark:text-[#717976] transition hover:text-[#01261f] dark:text-[#01261f]"
                  >
                    <FiX className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}

              </div>


              {/* Cuisine */}
              <div className="mt-7">

                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[#717976] dark:text-[#717976]">
                  Cuisine
                </label>

                <div className="space-y-1">

                  <button
                    type="button"
                    onClick={() => {
                      setCuisine('');
                      setPage(1);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      !cuisine
                        ? 'bg-[#01261f] dark:bg-[#01261f] font-semibold text-white'
                        : 'text-[#717976] dark:text-[#717976] hover:bg-[#e5e2e1] dark:bg-[#e5e2e1]'
                    }`}
                  >
                    All cuisines
                  </button>

                  {CUISINES.map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setCuisine(
                            item
                          );
                          setPage(1);
                        }}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          cuisine === item
                            ? 'bg-[#01261f] dark:bg-[#01261f] font-semibold text-white'
                            : 'text-[#717976] dark:text-[#717976] hover:bg-[#e5e2e1] dark:bg-[#e5e2e1]'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                </div>

              </div>


              {/* Price */}
              <div className="mt-7">

                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[#717976] dark:text-[#717976]">
                  Price range
                </label>

                <div className="space-y-1">

                  <button
                    type="button"
                    onClick={() => {
                      setPriceRange('');
                      setPage(1);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      !priceRange
                        ? 'bg-[#01261f] dark:bg-[#01261f] font-semibold text-white'
                        : 'text-[#717976] dark:text-[#717976] hover:bg-[#e5e2e1] dark:bg-[#e5e2e1]'
                    }`}
                  >
                    All prices
                  </button>

                  {PRICE_RANGES.map(
                    (item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setPriceRange(
                            item.value
                          );
                          setPage(1);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          priceRange ===
                          item.value
                            ? 'bg-[#01261f] dark:bg-[#01261f] font-semibold text-white'
                            : 'text-[#717976] dark:text-[#717976] hover:bg-[#e5e2e1] dark:bg-[#e5e2e1]'
                        }`}
                      >
                        <span>
                          {item.label}
                        </span>

                        <span
                          className={`text-xs ${
                            priceRange ===
                            item.value
                              ? 'text-[#717976] dark:text-[#717976]'
                              : 'text-[#717976] dark:text-[#717976]'
                          }`}
                        >
                          {item.description}
                        </span>
                      </button>
                    )
                  )}

                </div>

              </div>


              {/* Location */}
              <div className="mt-7">

                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[#717976] dark:text-[#717976]">
                  Location
                </label>

                <div className="relative">

                  <FiMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717976] dark:text-[#717976]" />

                  <input
                    type="text"
                    value={location}
                    onChange={(event) => {
                      setLocation(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    placeholder="City, address, or ZIP code"
                    className="h-11 w-full rounded-xl border border-[#c1c8c4] dark:border-[#c1c8c4] bg-[#f0edec] dark:bg-[#f0edec] pl-10 pr-3 text-sm outline-none transition focus:border-[#01261f] focus:bg-white dark:focus:bg-white dark:bg-white"
                  />

                </div>

              </div>


              {/* Clear */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-7 w-full rounded-xl bg-[#e5e2e1] dark:bg-[#e5e2e1] py-3 text-sm font-semibold text-[#01261f] dark:text-[#717976] transition hover:bg-[#e5e2e1] dark:bg-[#e5e2e1]"
                >
                  Clear all filters
                </button>
              )}

            </div>

          </aside>


          {/* =================================================
              RESULTS
          ================================================== */}

          <section>

            {/* Mobile filter */}
            <div className="mb-6 flex items-center justify-between lg:hidden">

              <p className="text-sm text-[#717976] dark:text-[#717976]">
                {loading
                  ? 'Finding restaurants...'
                  : `${totalCount} ${
                      totalCount === 1
                        ? 'restaurant'
                        : 'restaurants'
                    }`}
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    !showFilters
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white px-4 py-2.5 text-sm font-semibold text-[#01261f] dark:text-[#717976]"
              >
                <FiSliders />
                Filters
              </button>

            </div>


            {/* Results header */}
            <div className="mb-7 hidden items-end justify-between lg:flex">

              <div>

                {!loading && (
                  <p className="text-sm text-[#717976] dark:text-[#717976]">
                    Showing{' '}
                    <span className="font-semibold text-[#01261f] dark:text-[#01261f]">
                      {restaurants.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-[#01261f] dark:text-[#01261f]">
                      {totalCount}
                    </span>{' '}
                    restaurants
                  </p>
                )}

              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#717976] dark:text-[#717976] transition hover:text-[#01261f] dark:text-[#01261f]"
                >
                  <FiX />
                  Clear filters
                </button>
              )}

            </div>


            {/* =================================================
                ERROR
            ================================================== */}

            {error && !loading && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                  <FiX className="h-5 w-5" />
                </div>

                <h2 className="mt-4 font-serif text-xl font-semibold text-[#01261f] dark:text-[#01261f]">
                  Something went wrong
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#717976] dark:text-[#717976]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    fetchRestaurants
                  }
                  className="mt-5 rounded-xl bg-[#01261f] dark:bg-[#01261f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#01261f]"
                >
                  Try again
                </button>

              </div>
            )}


            {/* =================================================
                LOADING
            ================================================== */}

            {loading && (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                {Array.from(
                  { length: 6 }
                ).map(
                  (_, index) => (
                    <RestaurantSkeleton
                      key={index}
                    />
                  )
                )}

              </div>
            )}


            {/* =================================================
                EMPTY
            ================================================== */}

            {!loading &&
              !error &&
              restaurants.length ===
                0 && (
                <div className="rounded-3xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white px-6 py-20 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5e2e1] dark:bg-[#e5e2e1]">
                    <FiSearch className="h-7 w-7 text-[#717976] dark:text-[#717976]" />
                  </div>

                  <h2 className="mt-5 font-serif text-2xl font-semibold text-[#01261f] dark:text-[#01261f]">
                    No restaurants found
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#717976] dark:text-[#717976]">
                    We couldn't find any restaurants matching your current search or filters.
                  </p>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={
                        clearFilters
                      }
                      className="mt-6 rounded-xl bg-[#01261f] dark:bg-[#01261f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#01261f]"
                    >
                      Clear filters
                    </button>
                  )}

                </div>
              )}


            {/* =================================================
                RESTAURANT GRID
            ================================================== */}

            {!loading &&
              !error &&
              restaurants.length >
                0 && (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                  {restaurants.map(
                    (
                      restaurant
                    ) => (
                      <RestaurantGridCard
                        key={
                          restaurant.id
                        }
                        restaurant={
                          restaurant
                        }
                      />
                    )
                  )}

                </div>
              )}


            {/* =================================================
                PAGINATION
            ================================================== */}

            {!loading &&
              !error &&
              totalPages > 1 && (
                <div className="mt-12 flex flex-wrap items-center justify-center gap-2">

                  {/* Previous */}
                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                    className="flex h-10 items-center gap-1 rounded-xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white px-4 text-sm font-medium text-[#01261f] dark:text-[#717976] transition hover:border-[#01261f] dark:hover:border-[#01261f] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiChevronLeft />
                    <span className="hidden sm:inline">
                      Previous
                    </span>
                  </button>


                  {/* Pages */}
                  {paginationPages.map(
                    (pageNumber) => (
                      <button
                        key={
                          pageNumber
                        }
                        type="button"
                        onClick={() =>
                          setPage(
                            pageNumber
                          )
                        }
                        className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
                          pageNumber ===
                          page
                            ? 'bg-[#01261f] dark:bg-[#01261f] text-white'
                            : 'border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white text-[#717976] dark:text-[#717976] hover:border-[#01261f] dark:hover:border-[#01261f] hover:text-[#01261f] dark:text-[#01261f]'
                        }`}
                      >
                        {
                          pageNumber
                        }
                      </button>
                    )
                  )}


                  {/* Next */}
                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current +
                              1
                          )
                      )
                    }
                    className="flex h-10 items-center gap-1 rounded-xl border border-[#c1c8c4] bg-white dark:border-[#c1c8c4] dark:bg-white px-4 text-sm font-medium text-[#01261f] dark:text-[#717976] transition hover:border-[#01261f] dark:hover:border-[#01261f] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">
                      Next
                    </span>
                    <FiChevronRight />
                  </button>

                </div>
              )}

          </section>

        </div>

      </main>


   

    </div>
  );
}