import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-emerald-400 mb-4">ReserveEase</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Find your perfect table and enjoy an unforgettable dining experience.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link href="/restaurants" className="block text-gray-400 hover:text-emerald-400 transition">
                Restaurants
              </Link>
              <Link href="/login" className="block text-gray-400 hover:text-emerald-400 transition">
                Sign In
              </Link>
              <Link href="/register" className="block text-gray-400 hover:text-emerald-400 transition">
                Register
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">For Restaurants</h4>
            <div className="space-y-2 text-sm">
              <Link href="/register" className="block text-gray-400 hover:text-emerald-400 transition">
                List Your Restaurant
              </Link>
              <Link href="/dashboard" className="block text-gray-400 hover:text-emerald-400 transition">
                Staff Dashboard
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">contact@reserveease.com</p>
              <p className="text-gray-400">1-800-RESERVE</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          &copy; {year} ReserveEase. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
