'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  FiUsers,
  FiServer,
  FiCalendar,
  FiCheckCircle,
} from 'react-icons/fi';

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

interface AnalyticsResponse {
  data?: Stats;
  users?: number;
  restaurants?: number;
  reservations?: number;
}

interface RestaurantsResponse {
  data?: Restaurant[];
  restaurants?: Restaurant[];
}

interface UsersResponse {
  data?: User[];
  users?: User[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    restaurants: 0,
    reservations: 0,
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          restaurantsRes,
          usersRes,
        ] = await Promise.all([
          api.get<AnalyticsResponse>('/admin/analytics'),
          api.get<RestaurantsResponse>('/admin/restaurants'),
          api.get<UsersResponse>('/admin/users'),
        ]);

        const analytics = statsRes.data;

        setStats(
          analytics.data ?? {
            users: analytics.users ?? 0,
            restaurants: analytics.restaurants ?? 0,
            reservations: analytics.reservations ?? 0,
          }
        );

        setRestaurants(
          restaurantsRes.data.data ??
            restaurantsRes.data.restaurants ??
            []
        );

        setUsers(
          usersRes.data.data ??
            usersRes.data.users ??
            []
        );
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(id);

    try {
      const response = await api.put<{
        data?: Restaurant;
        restaurant?: Restaurant;
      }>(
        `/admin/restaurants/${id}/approve`
      );

      const updatedRestaurant =
        response.data.data ??
        response.data.restaurant;

      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === id
            ? updatedRestaurant ?? {
                ...restaurant,
                status: 'approved',
              }
            : restaurant
        )
      );
    } catch (err) {
      console.error(
        'Failed to approve restaurant:',
        err
      );
    } finally {
      setActionLoading(null);
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
    {
      label: 'Total Users',
      value: stats.users,
      icon: FiUsers,
      color: 'from-blue-600 to-blue-800',
    },
    {
      label: 'Restaurants',
      value: stats.restaurants,
      icon: FiServer,
      color: 'from-emerald-600 to-emerald-800',
    },
    {
      label: 'Reservations',
      value: stats.reservations,
      icon: FiCalendar,
      color: 'from-purple-600 to-purple-800',
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-8">
        Admin Overview
      </h1>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 shadow-lg`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-200 text-sm font-medium">
                {stat.label}
              </p>

              <stat.icon className="w-5 h-5 text-white/60" />
            </div>

            <p className="text-3xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Restaurants
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="text-left py-3 px-6 font-medium">
                  Name
                </th>
                <th className="text-left py-3 px-6 font-medium">
                  Cuisine
                </th>
                <th className="text-left py-3 px-6 font-medium">
                  Location
                </th>
                <th className="text-left py-3 px-6 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-6 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {restaurants.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-gray-500"
                  >
                    No restaurants found
                  </td>
                </tr>
              ) : (
                restaurants.map((restaurant) => (
                  <tr
                    key={restaurant.id}
                    className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50 transition"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      {restaurant.name}
                    </td>

                    <td className="py-4 px-6">
                      {restaurant.cuisine}
                    </td>

                    <td className="py-4 px-6">
                      {restaurant.location}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          restaurant.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : restaurant.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {restaurant.status === 'approved' && (
                          <FiCheckCircle className="w-3 h-3" />
                        )}

                        {restaurant.status ||
                          'pending'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {restaurant.status !== 'approved' && (
                        <button
                          onClick={() =>
                            handleApprove(restaurant.id)
                          }
                          disabled={
                            actionLoading === restaurant.id
                          }
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          <FiCheckCircle className="w-3.5 h-3.5" />

                          {actionLoading === restaurant.id
                            ? 'Approving...'
                            : 'Approve'}
                        </button>
                      )}
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
          <h2 className="text-lg font-semibold text-white">
            Users
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="text-left py-3 px-6 font-medium">
                  Name
                </th>

                <th className="text-left py-3 px-6 font-medium">
                  Email
                </th>

                <th className="text-left py-3 px-6 font-medium">
                  Role
                </th>

                <th className="text-left py-3 px-6 font-medium">
                  Joined
                </th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50 transition"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      {user.name}
                    </td>

                    <td className="py-4 px-6">
                      {user.email}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          user.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400'
                            : user.role === 'staff'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-sm">
                      {user.created_at
                        ? new Date(
                            user.created_at
                          ).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )
                        : '—'}
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