'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiUsers, FiServer, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  status: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Stats {
  users: number;
  restaurants: number;
  reservations: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, restaurants: 0, reservations: 0 });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, restaurantsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/restaurants'),
          api.get('/admin/users'),
        ]);
        setStats(statsRes.data);
        setRestaurants(restaurantsRes.data.data || restaurantsRes.data.restaurants || []);
        setUsers(usersRes.data.data || usersRes.data.users || []);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatus = async (id: number, status: string) => {
    try {
      await api.put(`/admin/restaurants/${id}/status`, { status });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Failed to update restaurant status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: FiUsers, color: 'from-blue-600 to-blue-800' },
    { label: 'Restaurants', value: stats.restaurants, icon: FiServer, color: 'from-emerald-600 to-emerald-800' },
    { label: 'Reservations', value: stats.reservations, icon: FiCalendar, color: 'from-purple-600 to-purple-800' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-8">Admin Overview</h1>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`bg-gradient-to-br ${s.color} rounded-xl p-6 shadow-lg`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-200 text-sm font-medium">{s.label}</p>
              <s.icon className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Restaurants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="text-left py-3 px-6 font-medium">Name</th>
                <th className="text-left py-3 px-6 font-medium">Cuisine</th>
                <th className="text-left py-3 px-6 font-medium">Location</th>
                <th className="text-left py-3 px-6 font-medium">Status</th>
                <th className="text-left py-3 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No restaurants found
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50 transition">
                    <td className="py-4 px-6 font-medium text-white">{r.name}</td>
                    <td className="py-4 px-6">{r.cuisine}</td>
                    <td className="py-4 px-6">{r.location}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : r.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {r.status === 'approved' && <FiCheckCircle className="w-3 h-3" />}
                        {r.status === 'rejected' && <FiXCircle className="w-3 h-3" />}
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {r.status !== 'approved' && (
                          <button
                            onClick={() => handleStatus(r.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            onClick={() => handleStatus(r.id, 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="text-left py-3 px-6 font-medium">Name</th>
                <th className="text-left py-3 px-6 font-medium">Email</th>
                <th className="text-left py-3 px-6 font-medium">Role</th>
                <th className="text-left py-3 px-6 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50 transition">
                    <td className="py-4 px-6 font-medium text-white">{u.name}</td>
                    <td className="py-4 px-6">{u.email}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400'
                            : u.role === 'staff'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
