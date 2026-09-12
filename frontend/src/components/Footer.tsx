import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-stone-100 transition-colors dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white dark:bg-orange-500">
                <span className="text-lg">🍽</span>
              </div>

              <span className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                Reserve<span className="text-orange-600 dark:text-orange-400">Ease</span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-stone-600 dark:text-stone-400">
              Find your perfect table and enjoy an unforgettable dining
              experience.
            </p>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Your table. Your moment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Quick Links
            </h3>

            <div className="space-y-3 text-sm">

              <Link
                href="/"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                Home
              </Link>

              <Link
                href="/restaurants"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                Restaurants
              </Link>

              <Link
                href="/login"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                Register
              </Link>

            </div>
          </div>

          {/* For Restaurants */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              For Restaurants
            </h3>

            <div className="space-y-3 text-sm">

              <Link
                href="/register"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                List Your Restaurant
              </Link>

              <Link
                href="/dashboard"
                className="block text-stone-600 transition hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400"
              >
                Staff Dashboard
              </Link>

            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Support
            </h3>

            <div className="space-y-3 text-sm">

              <p className="text-stone-600 dark:text-stone-400">
                contact@reserveease.com
              </p>

              <p className="text-stone-600 dark:text-stone-400">
                1-800-RESERVE
              </p>

              <p className="leading-6 text-stone-500 dark:text-stone-500">
                We're here to help you find and reserve your perfect dining
                experience.
              </p>

            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-3 border-t border-stone-200 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left dark:border-stone-800">

          <p className="text-sm text-stone-500 dark:text-stone-500">
            &copy; {year} ReserveEase. All rights reserved.
          </p>

          <div className="flex justify-center gap-5 text-sm sm:justify-end">

            <Link
              href="/restaurants"
              className="text-stone-500 transition hover:text-orange-600 dark:text-stone-500 dark:hover:text-orange-400"
            >
              Restaurants
            </Link>

            <Link
              href="/register"
              className="text-stone-500 transition hover:text-orange-600 dark:text-stone-500 dark:hover:text-orange-400"
            >
              Join ReserveEase
            </Link>

          </div>

        </div>

      </div>
    </footer>
  );
}