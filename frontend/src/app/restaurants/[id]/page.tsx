'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ReservationWidget from '@/components/ReservationWidget';
import { FiClock, FiMapPin, FiPhone, FiArrowLeft, FiStar } from 'react-icons/fi';

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  price_range: string;
  rating: number;
  location: string;
  image: string;
  hours?: string;
  phone?: string;
  description?: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
          api.get(`/restaurants/${id}`),
          api.get(`/restaurants/${id}/menu`),
          api.get(`/restaurants/${id}/reviews`),
        ]);
        setRestaurant(restaurantRes.data.data || restaurantRes.data);
        setMenuItems(menuRes.data.data || menuRes.data.menu_items || menuRes.data);
        setReviews(reviewsRes.data.data || reviewsRes.data.reviews || reviewsRes.data);
      } catch (err) {
        console.error('Failed to fetch restaurant data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4">
        <p className="text-gray-400 text-lg">Restaurant not found</p>
        <Link href="/restaurants" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          <FiArrowLeft className="w-4 h-4" /> Back to restaurants
        </Link>
      </div>
    );
  }

  const groupedMenu = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const tabs = [
    { key: 'about', label: 'About' },
    { key: 'menu', label: `Menu (${menuItems.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="relative h-64 sm:h-80 md:h-96">
        {restaurant.image ? (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-sm mb-3 transition"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to restaurants
          </Link>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
            <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded text-sm font-medium">
              {restaurant.cuisine}
            </span>
            <span className="text-gray-300">{restaurant.price_range}</span>
            <span className="flex items-center gap-1 text-yellow-400">
              <FiStar className="w-4 h-4 fill-current" /> {restaurant.rating}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <FiMapPin className="w-4 h-4" /> {restaurant.location}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="flex border-b border-gray-800 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 font-medium text-sm capitalize transition ${
                    activeTab === tab.key
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'about' && (
              <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                  {restaurant.description || 'No description available.'}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {restaurant.hours && (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <FiClock className="w-4 h-4" /> Hours
                      </div>
                      <p className="text-white font-medium">{restaurant.hours}</p>
                    </div>
                  )}
                  {restaurant.phone && (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <FiPhone className="w-4 h-4" /> Phone
                      </div>
                      <p className="text-white font-medium">{restaurant.phone}</p>
                    </div>
                  )}
                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <FiMapPin className="w-4 h-4" /> Location
                    </div>
                    <p className="text-white font-medium">{restaurant.location}</p>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <FiStar className="w-4 h-4" /> Cuisine / Price
                    </div>
                    <p className="text-white font-medium">{restaurant.cuisine} &middot; {restaurant.price_range}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="space-y-8">
                {Object.keys(groupedMenu).length === 0 ? (
                  <p className="text-gray-400">No menu items available.</p>
                ) : (
                  Object.entries(groupedMenu).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-xl font-semibold text-white mb-4 capitalize border-b border-gray-800 pb-2">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex justify-between items-start gap-4 hover:border-gray-700 transition"
                          >
                            <div>
                              <h4 className="text-white font-medium">{item.name}</h4>
                              {item.description && (
                                <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                              )}
                            </div>
                            <span className="text-emerald-400 font-semibold whitespace-nowrap">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-gray-400">No reviews yet.</p>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-gray-900 rounded-xl p-5 border border-gray-800"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-400 font-semibold flex-shrink-0">
                          {review.user_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{review.user_name}</span>
                            <span className="text-yellow-400 text-sm flex items-center">
                              {Array.from({ length: 5 }, (_, i) => (
                                <FiStar
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'opacity-30'}`}
                                />
                              ))}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-300">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <ReservationWidget restaurantId={Number(id)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
