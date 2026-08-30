'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  seating_type: string;
  status: 'available' | 'reserved' | 'occupied';
}

export default function TableMap() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const { data } = await api.get('/tables');
        setTables(data.data || data.tables || []);
      } catch (err) {
        console.error('Failed to fetch tables:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  const handleTableClick = async (table: Table) => {
    if (table.status === 'occupied') return;
    setSelectedId(table.id);
    const newStatus = table.status === 'available' ? 'reserved' : 'available';
    try {
      await api.put(`/tables/${table.id}/status`, { status: newStatus });
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 cursor-pointer';
      case 'reserved':
        return 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 cursor-pointer';
      case 'occupied':
        return 'bg-red-600 border-red-400 cursor-not-allowed opacity-80';
      default:
        return 'bg-gray-600 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No tables configured</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => handleTableClick(table)}
            disabled={table.status === 'occupied'}
            className={`p-3 rounded-lg border-2 text-white text-center transition ${
              statusColor(table.status)
            } ${selectedId === table.id ? 'ring-2 ring-blue-400' : ''}`}
          >
            <p className="font-bold text-lg">{table.table_number}</p>
            <p className="text-xs opacity-80">Cap: {table.capacity}</p>
            <p className="text-xs opacity-60 mt-0.5">{table.seating_type}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-yellow-600" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-600" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
