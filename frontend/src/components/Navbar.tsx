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

  /*
   * Navigation link styling
   * Uses the same colors as the DINEET footer.
   */
  const linkClass = (path: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      pathname === path
        ? 'bg-[#01261f] text-[#ffe088]'
        : 'text-[#717976] hover:bg-[#e5e2e1] hover:text-[#01261f]'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#c1c8c4]/40 bg-[#f0edec]/95 shadow-sm backdrop-blur-md transition-colors dark:border-[#c1c8c4]/20 dark:bg-[#01261f]/95">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex h-16 items-center justify-between">

          {/* =====================================================
              LOGO
          ====================================================== */}
          <Link
            href="/"
            className="group flex items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            {/* Logo Icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#01261f] text-[#ffe088] transition group-hover:bg-[#02382e]">
              <span className="text-lg">🍽</span>
            </div>

            {/* Brand Name */}
            <span className="font-serif text-2xl font-bold tracking-tight text-[#01261f] dark:text-[#f0edec]">
              DINEET
            </span>
          </Link>

          {/* =====================================================
              DESKTOP NAVIGATION
          ====================================================== */}
          <div className="hidden items-center gap-1 md:flex">

            <Link
              href="/"
              className={linkClass('/')}
            >
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

          {/* =====================================================
              DESKTOP RIGHT SIDE
          ====================================================== */}
          <div className="hidden items-center gap-3 md:flex">

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Divider */}
            <div className="h-7 w-px bg-[#c1c8c4]/60 dark:bg-[#c1c8c4]/30" />

            {auth ? (
              <>
                {/* User Name */}
                <span className="max-w-[160px] truncate text-sm font-medium text-[#717976] dark:text-[#c1c8c4]">
                  {user?.name}
                </span>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-[#c1c8c4] bg-transparent px-4 py-2 text-sm font-semibold text-[#01261f] transition hover:bg-[#01261f] hover:text-[#ffe088] dark:border-[#c1c8c4]/40 dark:text-[#f0edec] dark:hover:bg-[#ffe088] dark:hover:text-[#01261f]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Sign In */}
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-[#717976] transition hover:bg-[#e5e2e1] hover:text-[#01261f] dark:text-[#c1c8c4] dark:hover:bg-[#02382e] dark:hover:text-[#ffe088]"
                >
                  Sign In
                </Link>

                {/* Register */}
                <Link
                  href="/register"
                  className="rounded-xl bg-[#01261f] px-4 py-2 text-sm font-semibold text-[#ffe088] shadow-sm transition hover:bg-[#02382e] hover:shadow-md"
                >
                  Register
                </Link>
              </>
            )}

          </div>

          {/* =====================================================
              MOBILE CONTROLS
          ====================================================== */}
          <div className="flex items-center gap-2 md:hidden">

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c1c8c4] bg-transparent text-[#01261f] transition hover:border-[#01261f] hover:bg-[#e5e2e1] dark:border-[#c1c8c4]/40 dark:text-[#f0edec] dark:hover:border-[#ffe088] dark:hover:bg-[#02382e]"
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

        {/* =====================================================
            MOBILE NAVIGATION
        ====================================================== */}
        {mobileOpen && (
          <div className="border-t border-[#c1c8c4]/40 py-4 dark:border-[#c1c8c4]/20 md:hidden">

            {/* Navigation Links */}
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

            {/* Divider */}
            <div className="my-4 h-px bg-[#c1c8c4]/40 dark:bg-[#c1c8c4]/20" />

            {/* =================================================
                MOBILE AUTH
            ================================================== */}

            {auth ? (
              <div className="space-y-2">

                {/* User Information */}
                <div className="rounded-xl bg-[#e5e2e1] px-4 py-3 dark:bg-[#02382e]">

                  <p className="text-xs font-medium uppercase tracking-wide text-[#717976] dark:text-[#c1c8c4]">
                    Signed in as
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold text-[#01261f] dark:text-[#f0edec]">
                    {user?.name}
                  </p>

                </div>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#01261f] transition hover:bg-[#e5e2e1] dark:text-[#ffe088] dark:hover:bg-[#02382e]"
                >
                  Logout
                </button>

              </div>
            ) : (
              <div className="space-y-2">

                {/* Sign In */}
                <Link
                  href="/login"
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#717976] transition hover:bg-[#e5e2e1] hover:text-[#01261f] dark:text-[#c1c8c4] dark:hover:bg-[#02382e] dark:hover:text-[#ffe088]"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>

                {/* Create Account */}
                <Link
                  href="/register"
                  className="block rounded-xl bg-[#01261f] px-4 py-3 text-center text-sm font-semibold text-[#ffe088] transition hover:bg-[#02382e]"
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