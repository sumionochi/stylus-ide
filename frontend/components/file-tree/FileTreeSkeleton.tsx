'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function FileTreeSkeleton() {
  return (
    <div className="h-full p-2 space-y-1">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
      </div>

      {/* Folder skeletons */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" style={{ width: `${Math.random() * 100 + 80}px` }} />
        </div>
      ))}
    </div>
  );
}