import React from 'react';

/** A single animated skeleton placeholder block */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/** Skeleton for a service card in grid view */
export const ServiceCardSkeleton: React.FC = () => (
  <div className="card overflow-hidden flex flex-col">
    <SkeletonBlock className="h-48 rounded-none" />
    <div className="p-4 flex-1 flex flex-col gap-2">
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-5/6" />
      <div className="flex items-center justify-between pt-3 mt-auto">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-7 h-7 rounded-full" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
        <SkeletonBlock className="h-5 w-16" />
      </div>
    </div>
  </div>
);

/** Skeleton for a service card in list view */
export const ServiceListSkeleton: React.FC = () => (
  <div className="card flex gap-4 p-4">
    <SkeletonBlock className="w-24 h-24 rounded-xl flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-2 justify-center">
      <SkeletonBlock className="h-4 w-1/2" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-1/4 mt-1" />
    </div>
  </div>
);

/** Skeleton grid for Services page */
export const ServicesGridSkeleton: React.FC<{ count?: number; viewMode?: 'grid' | 'list' }> = ({ count = 6, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => <ServiceListSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => <ServiceCardSkeleton key={i} />)}
    </div>
  );
};

/** Skeleton for the ServicesDetail page */
export const ServiceDetailSkeleton: React.FC = () => (
  <div className="min-h-screen py-8 animate-pulse">
    <div className="container-custom max-w-5xl">
      <SkeletonBlock className="h-4 w-48 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <SkeletonBlock className="h-72 rounded-none" />
            <div className="p-6 space-y-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-7 w-3/4" />
              <div className="flex items-center gap-4 pb-6">
                <SkeletonBlock className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-24" />
                </div>
              </div>
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          </div>
          <div className="card p-6 space-y-3">
            <SkeletonBlock className="h-5 w-32" />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map(i => <SkeletonBlock key={i} className="h-8 w-12 rounded-full" />)}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/** Skeleton for Dashboard / VendorDashboard page */
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen py-8 animate-pulse">
    <div className="container-custom">
      <SkeletonBlock className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-5 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-8 w-1/2" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-1/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
