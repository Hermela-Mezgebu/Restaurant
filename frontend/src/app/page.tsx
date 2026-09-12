'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiCalendar,
  FiClock,
  FiUsers,
  FiArrowRight,
  FiSearch,
  FiMapPin,
  FiStar,
  FiCoffee,
  FiHeart,
  FiChevronRight,
  FiCheck,
} from 'react-icons/fi';

const restaurants = [
  {
    name: 'Kategna Restaurant',
    cuisine: 'Ethiopian',
    location: 'Bole, Addis Ababa',
    rating: 4.8,
    price: '$$',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    times: ['6:30 PM', '7:00 PM', '8:00 PM'],
    tag: 'Popular',
  },
  {
    name: '2000 Habesha',
    cuisine: 'Traditional Ethiopian',
    location: 'Bole, Addis Ababa',
    rating: 4.7,
    price: '$$',
    image:
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80',
    times: ['7:00 PM', '7:30 PM', '9:00 PM'],
    tag: 'Experience',
  },
  {
    name: 'Kaffa House',
    cuisine: 'Ethiopian Coffee & Dining',
    location: 'Kazanchis, Addis Ababa',
    rating: 4.9,
    price: '$$$',
    image:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
    times: ['5:30 PM', '7:00 PM', '8:30 PM'],
    tag: 'Top Rated',
  },
];

const experiences = [
  {
    title: 'Ethiopian Coffee Ceremony',
    description:
      'Experience authentic Buna with traditional preparation and hospitality.',
    icon: FiCoffee,
  },
  {
    title: 'Romantic Dinner',
    description:
      'Find intimate restaurants and beautiful tables for a special evening.',
    icon: FiHeart,
  },
  {
    title: 'Traditional Dining',
    description:
      'Discover restaurants offering authentic Ethiopian food and culture.',
    icon: FiUsers,
  },
];

export default function Home() {
  const router = useRouter();

  const [searchCuisine, setSearchCuisine] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [searchGuests, setSearchGuests] = useState('2');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (searchCuisine) params.set('cuisine', searchCuisine);
    if (searchLocation) params.set('location', searchLocation);
    if (searchDate) params.set('date', searchDate);
    if (searchTime) params.set('time', searchTime);
    if (searchGuests) params.set('guests', searchGuests);

    router.push(`/restaurants?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-stone-900">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-stone-950 to-stone-950" />

        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-3xl" />

        <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-orange-900/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">

          <div className="mb-7 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-2 text-sm text-orange-300">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              Discover dining in Ethiopia
            </div>
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-stone-100 sm:text-6xl lg:text-7xl">
              Find your
              <span className="text-orange-400"> perfect table.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-stone-400 sm:text-xl">
              Discover exceptional restaurants, explore unique dining
              experiences, and reserve your table in seconds.
            </p>
          </div>

          {/* SEARCH */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-12 max-w-5xl rounded-2xl border border-stone-800 bg-stone-900/90 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">

              {/* Cuisine */}
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />

                <select
                  value={searchCuisine}
                  onChange={(e) => setSearchCuisine(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-stone-800 bg-stone-800/80 pl-11 pr-4 text-sm text-stone-100 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Any cuisine</option>
                  <option value="Ethiopian">Ethiopian</option>
                  <option value="Traditional Ethiopian">
                    Traditional Ethiopian
                  </option>
                  <option value="International">International</option>
                  <option value="Italian">Italian</option>
                  <option value="Asian">Asian</option>
                  <option value="Fast Food">Fast Food</option>
                </select>
              </div>

              {/* Location */}
              <div className="relative">
                <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />

                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Location"
                  className="h-12 w-full rounded-xl border border-stone-800 bg-stone-800/80 pl-11 pr-4 text-sm text-stone-100 placeholder-gray-500 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Date */}
              <div className="relative">
                <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />

                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-stone-800 bg-stone-800/80 pl-11 pr-4 text-sm text-stone-100 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Time + Guests */}
              <div className="grid grid-cols-2 gap-2">

                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />

                  <select
                    value={searchTime}
                    onChange={(e) => setSearchTime(e.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-stone-800 bg-stone-800/80 pl-9 pr-2 text-sm text-stone-100 outline-none focus:border-orange-500"
                  >
                    <option value="">Time</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="18:30">6:30 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="19:30">7:30 PM</option>
                    <option value="20:00">8:00 PM</option>
                    <option value="20:30">8:30 PM</option>
                    <option value="21:00">9:00 PM</option>
                  </select>
                </div>

                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />

                  <select
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-stone-800 bg-stone-800/80 pl-9 pr-2 text-sm text-stone-100 outline-none focus:border-orange-500"
                  >
                    <option value="1">1 guest</option>
                    <option value="2">2 guests</option>
                    <option value="3">3 guests</option>
                    <option value="4">4 guests</option>
                    <option value="5">5 guests</option>
                    <option value="6">6 guests</option>
                    <option value="7">7 guests</option>
                    <option value="8">8 guests</option>
                    <option value="10">10+ guests</option>
                  </select>
                </div>

              </div>

              {/* Search button */}
              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 font-semibold text-stone-100 transition hover:bg-orange-500 active:scale-[0.98]"
              >
                Search
                <FiArrowRight />
              </button>

            </div>
          </form>

          {/* Popular searches */}
          <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-stone-500">Popular:</span>

            {['Ethiopian', 'Bole', 'Kazanchis', 'Rooftop', 'Coffee'].map(
              (item) => (
                <Link
                  key={item}
                  href={`/restaurants?search=${encodeURIComponent(item)}`}
                  className="text-stone-400 transition hover:text-orange-400"
                >
                  {item}
                </Link>
              )
            )}
          </div>

        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-stone-900 bg-stone-950">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-stone-800 px-4 py-7 sm:grid-cols-4 lg:px-8">

          {[
            ['500+', 'Restaurants'],
            ['10K+', 'Reservations'],
            ['4.8/5', 'Average rating'],
            ['24/7', 'Easy booking'],
          ].map(([number, label]) => (
            <div key={label} className="px-4 text-center">
              <div className="text-xl font-bold text-stone-100">
                {number}
              </div>

              <div className="mt-1 text-xs text-stone-500 sm:text-sm">
                {label}
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* RESTAURANTS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

        <div className="mb-10 flex items-end justify-between gap-6">

          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-orange-400">
              Tonight in Addis
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-stone-100 sm:text-4xl">
              Tables waiting for you
            </h2>

            <p className="mt-3 text-stone-400">
              Explore highly rated restaurants with available tables tonight.
            </p>
          </div>

          <Link
            href="/restaurants"
            className="hidden items-center gap-2 text-sm font-semibold text-orange-400 transition hover:text-orange-300 sm:flex"
          >
            View all
            <FiArrowRight />
          </Link>

        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {restaurants.map((restaurant) => (
            <Link
              href={`/restaurants/${restaurant.name
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              key={restaurant.name}
              className="group overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 transition duration-300 hover:-translate-y-1 hover:border-orange-600/40 hover:shadow-xl hover:shadow-black/20"
            >

              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">

                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                <div className="absolute left-4 top-4 rounded-full border border-stone-100/10 bg-stone-950/60 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
                  {restaurant.tag}
                </div>

                <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg bg-stone-950/70 px-2.5 py-1.5 text-sm backdrop-blur">
                  <FiStar className="fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {restaurant.rating}
                  </span>
                </div>

              </div>

              {/* Content */}
              <div className="p-5">

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <h3 className="text-lg font-semibold text-stone-100 transition group-hover:text-orange-400">
                      {restaurant.name}
                    </h3>

                    <p className="mt-1 text-sm text-stone-500">
                      {restaurant.cuisine}
                    </p>
                  </div>

                  <span className="text-sm font-medium text-stone-400">
                    {restaurant.price}
                  </span>

                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-stone-400">
                  <FiMapPin className="text-orange-500" />
                  {restaurant.location}
                </div>

                <div className="mt-5 border-t border-stone-800 pt-4">

                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                    Available tonight
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {restaurant.times.map((time) => (
                      <span
                        key={time}
                        className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-1.5 text-xs font-medium text-orange-400"
                      >
                        {time}
                      </span>
                    ))}

                  </div>

                </div>

              </div>

            </Link>
          ))}

        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400"
          >
            View all restaurants
            <FiArrowRight />
          </Link>
        </div>

      </section>

      {/* EXPERIENCES */}
      <section className="border-y border-stone-900 bg-stone-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

          <div className="mx-auto mb-12 max-w-2xl text-center">

            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-orange-400">
              More than a reservation
            </p>

            <h2 className="text-3xl font-bold text-stone-100 sm:text-4xl">
              Choose your dining experience
            </h2>

            <p className="mt-4 text-stone-400">
              Whether it&apos;s a special celebration or a simple coffee,
              ReserveEase helps you find the right experience.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {experiences.map((experience) => {
              const Icon = experience.icon;

              return (
                <Link
                  href={`/experiences/${experience.title
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`}
                  key={experience.title}
                  className="group rounded-2xl border border-stone-800 bg-stone-950 p-7 transition hover:border-orange-600/40 hover:bg-stone-900"
                >

                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500/20">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-xl font-semibold text-stone-100 group-hover:text-orange-400">
                    {experience.title}
                  </h3>

                  <p className="mt-3 leading-7 text-stone-400">
                    {experience.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-orange-400">
                    Explore experience
                    <FiChevronRight className="transition group-hover:translate-x-1" />
                  </div>

                </Link>
              );
            })}

          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

          <div>

            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-orange-400">
              Simple by design
            </p>

            <h2 className="text-3xl font-bold text-stone-100 sm:text-4xl">
              Your table is just a few clicks away.
            </h2>

            <p className="mt-5 max-w-lg leading-7 text-stone-400">
              ReserveEase removes the friction from restaurant reservations.
              Find a restaurant, choose the perfect time, and arrive knowing
              your table is ready.
            </p>

            <Link
              href="/restaurants"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-semibold transition hover:bg-orange-500"
            >
              Find a restaurant
              <FiArrowRight />
            </Link>

          </div>

          <div className="grid gap-5 sm:grid-cols-3">

            {[
              {
                number: '01',
                title: 'Discover',
                description:
                  'Find restaurants based on cuisine, location, occasion and availability.',
              },
              {
                number: '02',
                title: 'Reserve',
                description:
                  'Choose your date, time, party size and preferred table.',
              },
              {
                number: '03',
                title: 'Dine',
                description:
                  'Arrive, enjoy your experience and share your review.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-stone-800 bg-stone-900 p-6"
              >

                <div className="mb-8 text-sm font-bold text-orange-400">
                  {step.number}
                </div>

                <h3 className="text-xl font-semibold text-stone-100">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-stone-400">
                  {step.description}
                </p>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* BENEFITS */}
      <section className="border-y border-stone-900 bg-stone-900/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="mb-3 text-sm font-medium uppercase tracking-wider text-orange-400">
                Built for better dining
              </p>

              <h2 className="text-3xl font-bold text-stone-100 sm:text-4xl">
                Everything you need before you take the first bite.
              </h2>

              <p className="mt-5 leading-7 text-stone-400">
                From real-time table availability to personalized dining
                experiences, ReserveEase gives you more control over your night out.
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {[
                'Real-time table availability',
                'Instant reservation confirmation',
                'Restaurant reviews',
                'Personalized recommendations',
                'Special dining experiences',
                'Easy reservation management',
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950 p-4"
                >

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <FiCheck className="h-4 w-4 text-orange-400" />
                  </div>

                  <span className="text-sm text-stone-300">
                    {feature}
                  </span>

                </div>
              ))}

            </div>

          </div>

        </div>
      </section>

      {/* RESTAURANT CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

        <div className="relative overflow-hidden rounded-3xl border border-emerald-800/30 bg-gradient-to-br from-emerald-950/60 via-gray-900 to-stone-900 p-10 sm:p-14">

          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <div className="mb-4 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                FOR RESTAURANTS
              </div>

              <h2 className="max-w-2xl text-3xl font-bold text-stone-100 sm:text-4xl">
                Turn every reservation into a better guest experience.
              </h2>

              <p className="mt-4 max-w-2xl text-lg leading-7 text-stone-400">
                Manage reservations, tables, guests, waitlists and restaurant
                operations from one powerful platform.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <FiCheck className="text-orange-400" />
                  Live table management
                </div>

                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <FiCheck className="text-orange-400" />
                  Guest management
                </div>

                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <FiCheck className="text-orange-400" />
                  Reservation analytics
                </div>

              </div>

            </div>

            <Link
              href="/register?role=restaurant"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 font-semibold text-stone-100 shadow-lg shadow-orange-950/30 transition hover:bg-orange-500"
            >
              List your restaurant
              <FiArrowRight />
            </Link>

          </div>

        </div>

      </section>

      {/* FINAL CTA */}
      <section className="border-t border-stone-900">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">

          <h2 className="text-3xl font-bold text-stone-100 sm:text-4xl">
            Your next great meal starts here.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-stone-400">
            Explore restaurants across Addis Ababa and discover your next
            favorite dining experience.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">

            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 font-semibold transition hover:bg-orange-500"
            >
              Explore restaurants
              <FiArrowRight />
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-stone-700 bg-stone-900 px-7 py-3.5 font-semibold text-stone-100 transition hover:bg-stone-800"
            >
              Create an account
            </Link>

          </div>

        </div>
      </section>

    </main>
  );
}