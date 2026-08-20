'use client';

import React from 'react';
import { CURRENCY_SYMBOL } from '@/lib/constants';

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  currency?: string;
  className?: string;
}

export default function PriceDisplay({
  price,
  compareAtPrice,
  currency,
  className = '',
}: PriceDisplayProps) {
  const sym = currency || CURRENCY_SYMBOL;
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)
    : 0;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className={`font-semibold ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
        {sym}{price.toLocaleString()}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-gray-400 line-through">
            {sym}{compareAtPrice!.toLocaleString()}
          </span>
          <span className="text-xs font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
