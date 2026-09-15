import { Suspense } from 'react';
import RestaurantsPageClient from './RestaurantsPageClient';

function RestaurantsLoading() {
  return (
    <div className="min-h-screen bg-[#fcf9f7]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[#e9e4e1]" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl bg-[#e9e4e1]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<RestaurantsLoading />}>
      <RestaurantsPageClient />
    </Suspense>
  );
}