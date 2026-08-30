'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiClock, FiUsers, FiArrowRight, FiSearch } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();
  const [searchCuisine, setSearchCuisine] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCuisine) params.set('cuisine', searchCuisine);
    if (searchLocation) params.set('location', searchLocation);
    router.push(`/restaurants?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-800/10 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
            Find Your <span className="text-emerald-400">Perfect Table</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Discover the best restaurants and reserve your spot instantly.
            From intimate dinners to group celebrations, we&apos;ve got you covered.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto bg-gray-900/80 backdrop-blur rounded-xl p-4 border border-gray-800 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={searchCuisine}
                  onChange={(e) => setSearchCuisine(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Cuisines</option>
                  <option value="Italian">Italian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Indian">Indian</option>
                  <option value="American">American</option>
                  <option value="French">French</option>
                  <option value="Mediterranean">Mediterranean</option>
                </select>
              </div>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Location..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                Search <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Link
              href="/restaurants"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition shadow-lg shadow-emerald-600/20"
            >
              Browse Restaurants
            </Link>
            <Link
              href="/register"
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg border border-gray-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose ReserveEase?</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { title: 'Easy Booking', desc: 'Reserve a table in seconds with our intuitive booking system. No phone calls needed.', icon: FiCalendar },
            { title: 'Real-Time Availability', desc: 'See live table availability and book instantly. No more waiting for confirmation.', icon: FiClock },
            { title: 'Exclusive Deals', desc: 'Get access to special offers and loyalty rewards at your favorite restaurants.', icon: FiUsers },
          ].map((f) => (
            <div key={f.title} className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800 hover:border-emerald-600/50 transition group">
              <div className="w-14 h-14 bg-emerald-600/10 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-emerald-600/20 transition">
                <f.icon className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-900/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-emerald-600/0 via-emerald-600/50 to-emerald-600/0" />
            {[
              { step: '01', title: 'Find a Restaurant', desc: 'Browse through our curated list of restaurants, filter by cuisine, price, and location to find your perfect match.' },
              { step: '02', title: 'Choose Your Table', desc: 'Select your date, time, and party size. See available tables in real-time and book instantly.' },
              { step: '03', title: 'Enjoy Your Meal', desc: 'Show up at the restaurant and enjoy your dining experience. Rate and review afterward!' },
            ].map((s) => (
              <div key={s.step} className="text-center relative">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-emerald-400 font-bold text-xl">{s.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-gray-400 max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-br from-emerald-900/30 to-gray-900 rounded-2xl p-12 border border-emerald-800/30">
          <h2 className="text-3xl font-bold text-white mb-4">Own a Restaurant?</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">
            Join ReserveEase and reach more customers. Manage reservations, tables, and staff all in one place.
          </p>
          <Link
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            List Your Restaurant <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
