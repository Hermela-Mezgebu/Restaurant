'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiCalendar, FiUsers, FiXCircle } from 'react-icons/fi';

interface Reservation {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  date: string;
  time: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled';
  created_at: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  seated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  completed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/reservations', {
          params: { type: activeTab },
        });
        setReservations(data.data || data.reservations || []);
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [activeTab]);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await api.put(`/reservations/${id}/cancel`);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
      );
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">My Reservations</h1>

        <div className="flex gap-2 mb-8">
          {(['upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No {activeTab} reservations</p>
            <p className="text-gray-600 mt-1">
              {activeTab === 'upcoming'
                ? 'Browse restaurants and make a reservation to get started'
                : 'Your completed and cancelled reservations will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => (
              <div
                key={r.id}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {r.restaurant_name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          statusStyles[r.status] || statusStyles.pending
                        }`}
                      >
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar className="w-4 h-4" />
                        {new Date(r.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>{r.time}</span>
                      <span className="flex items-center gap-1.5">
                        <FiUsers className="w-4 h-4" />
                        {r.party_size} {r.party_size === 1 ? 'guest' : 'guests'}
                      </span>
                    </div>
                  </div>

                  {(r.status === 'pending' || r.status === 'confirmed') && activeTab === 'upcoming' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition whitespace-nowrap"
                    >
                      <FiXCircle className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
