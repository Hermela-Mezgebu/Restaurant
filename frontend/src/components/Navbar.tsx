'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, isAuthenticated, isAdmin, isStaff, logout } from '@/lib/auth';

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
    router.push('/');
  };

  const linkClass = (path: string) =>
    `transition ${pathname === path ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`;

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-emerald-400">
            ReserveEase
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={linkClass('/')}>Home</Link>
            <Link href="/restaurants" className={linkClass('/restaurants')}>Restaurants</Link>
            {auth && staff && <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>}
            {auth && admin && <Link href="/admin" className={linkClass('/admin')}>Admin</Link>}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {auth ? (
              <>
                <span className="text-gray-300 text-sm">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white transition">Sign In</Link>
                <Link
                  href="/register"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-300 hover:text-white"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/" className="block px-3 py-2 text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link href="/restaurants" className="block px-3 py-2 text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>Restaurants</Link>
            {auth && staff && (
              <Link href="/dashboard" className="block px-3 py-2 text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            )}
            {auth && admin && (
              <Link href="/admin" className="block px-3 py-2 text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>Admin</Link>
            )}
            <hr className="border-gray-800 my-2" />
            {auth ? (
              <>
                <span className="block px-3 py-2 text-gray-400 text-sm">Signed in as {user?.name}</span>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link href="/register" className="block px-3 py-2 text-emerald-400 hover:text-emerald-300" onClick={() => setMobileOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
