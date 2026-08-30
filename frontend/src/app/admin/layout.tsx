import Link from 'next/link';
import { FiBarChart2, FiServer, FiUsers, FiCalendar } from 'react-icons/fi';

const sidebarLinks = [
  { href: '/admin', label: 'Overview', icon: FiBarChart2 },
  { href: '/admin/restaurants', label: 'Restaurants', icon: FiServer },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/reservations', label: 'Reservations', icon: FiCalendar },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 hidden lg:flex flex-col flex-shrink-0">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <FiBarChart2 className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Admin Panel</h2>
        </div>
        <nav className="space-y-1 flex-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <link.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
