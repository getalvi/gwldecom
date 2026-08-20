'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import RatingStars from './RatingStars';
import PriceDisplay from './PriceDisplay';
import { useNavigationStore } from '@/lib/store';

interface ProductCardProps {
  id: string;
  slug?: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  category?: string;
  avgRating?: number;
  reviewCount?: number;
  stockQuantity?: number;
  isFeatured?: boolean;
}

export default function ProductCard({
  id,
  title,
  price,
  compareAtPrice,
  images,
  category,
  avgRating,
  reviewCount,
  stockQuantity,
  isFeatured,
}: ProductCardProps) {
  const navigate = useNavigationStore((s) => s.navigate);
  const [wished, setWished] = useState(false);
  const outOfStock = stockQuantity === 0;
  const lowStock = stockQuantity !== undefined && stockQuantity > 0 && stockQuantity < 5;

  const handleClick = () => {
    navigate('product', { id });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWished(!wished);
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={
            images && images.length > 0
              ? images[0]
              : 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
          }
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {compareAtPrice && compareAtPrice > price && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            -{Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}%
          </span>
        )}

        {/* Featured Badge */}
        {isFeatured && !compareAtPrice && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md">
            Featured
          </span>
        )}

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-sm font-semibold px-3 py-1.5 rounded-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all hover:scale-110"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              wished ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Category */}
        {category && (
          <p className="text-xs text-gray-400 mb-1 truncate">{category}</p>
        )}

        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Rating */}
        {avgRating !== undefined && avgRating > 0 && (
          <div className="mb-2">
            <RatingStars
              rating={avgRating}
              size="sm"
              showCount={!!reviewCount}
              count={reviewCount}
            />
          </div>
        )}

        {/* Price */}
        <PriceDisplay
          price={price}
          compareAtPrice={compareAtPrice}
        />

        {/* Stock Status */}
        {lowStock && !outOfStock && (
          <p className="text-xs text-orange-600 mt-1.5 font-medium">
            Only {stockQuantity} left in stock
          </p>
        )}
      </div>
    </div>
  );
}
