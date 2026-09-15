'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import TableMap from '@/components/TableMap';
import { FiCalendar, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface Reservation {
  id: number;
  customer_name: string;
  date: string;
  time: string;
  party_size: number;
  status: string;
  notes?: string;
  table_number?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  seated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  completed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState('today');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const getParams = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (dateFilter === 'today') return { date: todayStr };
    if (dateFilter === 'week') {
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const wlMm = String(weekLater.getMonth() + 1).padStart(2, '0');
      const wlDd = String(weekLater.getDate()).padStart(2, '0');
      return { date_from: todayStr, date_to: `${weekLater.getFullYear()}-${wlMm}-${wlDd}` };
    }
    if (dateFilter === 'month') {
      const monthLater = new Date(today);
      monthLater.setMonth(monthLater.getMonth() + 1);
      const mlMm = String(monthLater.getMonth() + 1).padStart(2, '0');
      const mlDd = String(monthLater.getDate()).padStart(2, '0');
      return { date_from: todayStr, date_to: `${monthLater.getFullYear()}-${mlMm}-${mlDd}` };
    }
    return { date: todayStr };
  };

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/reservations/staff', {
          params: getParams(),
        });
        setReservations(data.data || data.reservations || []);
      } catch (err) {
        console.error('Failed to fetch reservations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [dateFilter]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/reservations/${id}/status`, { status });
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Failed to update reservation status:', err);
    }
  };

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const seatedCount = reservations.filter((r) => r.status === 'seated').length;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-2 mt-4 sm:mt-0">
          {(['today', 'week', 'month'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                dateFilter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-medium">Pending</p>
          <p className="text-2xl font-bold text-white mt-1">{pendingCount}</p>
        </div>
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
          <p className="text-blue-400 text-sm font-medium">Confirmed</p>
          <p className="text-2xl font-bold text-white mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-xl p-4">
          <p className="text-emerald-400 text-sm font-medium">Seated</p>
          <p className="text-2xl font-bold text-white mt-1">{seatedCount}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Reservations</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
              <p className="text-gray-400">No reservations for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <div
                  key={r.id}
                  className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-medium truncate">{r.customer_name}</h3>
                      <p className="text-gray-400 text-sm mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="w-3.5 h-3.5" />
                          {r.time}
                        </span>
                        <span className="mx-2">&middot;</span>
                        <span className="inline-flex items-center gap-1">
                          <FiUsers className="w-3.5 h-3.5" />
                          {r.party_size} {r.party_size === 1 ? 'guest' : 'guests'}
                        </span>
                        {r.table_number && (
                          <>
                            <span className="mx-2">&middot;</span>
                            <span>Table {r.table_number}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                        statusColors[r.status] || statusColors.pending
                      }`}
                    >
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-gray-500 text-xs mb-3 bg-gray-800/50 rounded px-2 py-1">
                      Note: {r.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(r.id, 'confirmed')}
                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          <FiCheckCircle className="w-3.5 h-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(r.id, 'cancelled')}
                          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          <FiXCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    )}
                    {r.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(r.id, 'seated')}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                      >
                        <FiCheckCircle className="w-3.5 h-3.5" /> Check In
                      </button>
                    )}
                    {r.status === 'seated' && (
                      <button
                        onClick={() => handleStatusUpdate(r.id, 'completed')}
                        className="inline-flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Table Layout</h2>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <TableMap />
          </div>
        </div>
      </div>
    </div>
  );
}
