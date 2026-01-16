
import React from 'react';
import { cn } from '@/lib/utils';

const SkeletonLoader = ({ className, count = 1, height = "20px", width = "100%" }) => {
  return (
    <div className="space-y-2 w-full animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("bg-gray-200 animate-pulse rounded-md", className)}
          style={{ height, width }}
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;
