'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';
import {
  getUser,
  isAuthenticated,
  isAdmin,
  isStaff,
  logout,
} from '@/lib/auth';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getUser() : null;
  const auth = mounted ? isAuthenticated() : false;
  const admin = mounted ? isAdmin() : false;
  const staff = mounted ? isStaff() : false;

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    router.push('/');
  };

  const linkClass = (path: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      pathname === path
        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
        : 'text-stone-600 hover:bg-stone-100 hover:text-orange-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-orange-300'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur-md transition-colors dark:border-stone-800 dark:bg-stone-950/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm transition group-hover:bg-orange-700 dark:bg-orange-500 dark:group-hover:bg-orange-400">
              <span className="text-lg">🍽</span>
            </div>

            <span className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Reserve<span className="text-orange-600 dark:text-orange-400">Ease</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/" className={linkClass('/')}>
              Home
            </Link>

            <Link
              href="/restaurants"
              className={linkClass('/restaurants')}
            >
              Restaurants
            </Link>

            {auth && staff && (
              <Link
                href="/dashboard"
                className={linkClass('/dashboard')}
              >
                Dashboard
              </Link>
            )}

            {auth && admin && (
              <Link
                href="/admin"
                className={linkClass('/admin')}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden items-center gap-3 md:flex">

            <ThemeToggle />

            <div className="h-7 w-px bg-stone-200 dark:bg-stone-800" />

            {auth ? (
              <>
                <span className="max-w-[160px] truncate text-sm font-medium text-stone-600 dark:text-stone-300">
                  {user?.name}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-orange-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-orange-300"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 hover:shadow-md dark:bg-orange-500 dark:text-stone-950 dark:hover:bg-orange-400"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-orange-700 dark:hover:bg-orange-950/40 dark:hover:text-orange-300"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="border-t border-stone-200 py-4 dark:border-stone-800 md:hidden">

            <div className="space-y-1">

              <Link
                href="/"
                className={`block ${linkClass('/')}`}
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>

              <Link
                href="/restaurants"
                className={`block ${linkClass('/restaurants')}`}
                onClick={() => setMobileOpen(false)}
              >
                Restaurants
              </Link>

              {auth && staff && (
                <Link
                  href="/dashboard"
                  className={`block ${linkClass('/dashboard')}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              {auth && admin && (
                <Link
                  href="/admin"
                  className={`block ${linkClass('/admin')}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Admin
                </Link>
              )}
            </div>

            <div className="my-4 h-px bg-stone-200 dark:bg-stone-800" />

            {auth ? (
              <div className="space-y-2">

                <div className="rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    Signed in as
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {user?.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">

                <Link
                  href="/login"
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-orange-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-orange-300"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  className="block rounded-xl bg-orange-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-700 dark:bg-orange-500 dark:text-stone-950 dark:hover:bg-orange-400"
                  onClick={() => setMobileOpen(false)}
                >
                  Create Account
                </Link>

              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}