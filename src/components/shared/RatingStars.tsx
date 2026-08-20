'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
}

const SIZE_MAP = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export default function RatingStars({ rating, size = 'md', showCount, count }: RatingStarsProps) {
  const starSize = SIZE_MAP[size];
  const clampedRating = Math.max(0, Math.min(5, rating));

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const diff = clampedRating - star;
          if (diff >= 0) {
            // Full star
            return (
              <Star
                key={star}
                className={`${starSize} text-amber-400 fill-amber-400`}
              />
            );
          } else if (diff >= -0.5) {
            // Half star - use clip
            return (
              <div key={star} className="relative">
                <Star className={`${starSize} text-gray-300`} />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className={`${starSize} text-amber-400 fill-amber-400`} />
                </div>
              </div>
            );
          } else {
            // Empty star
            return (
              <Star
                key={star}
                className={`${starSize} text-gray-300`}
              />
            );
          }
        })}
      </div>
      {showCount && count !== undefined && (
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {count}
        </span>
      )}
    </div>
  );
}
