'use client';

import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  Shirt,
  Home as HomeIcon,
  Sparkles,
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import { useNavigationStore } from '@/lib/store';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count: { products: number; children: number };
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  electronics: Smartphone,
  fashion: Shirt,
  'home-and-living': HomeIcon,
  beauty: Sparkles,
};

const CATEGORY_COLORS: Record<string, { bg: string; icon: string; badge: string }> = {
  electronics: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  fashion: { bg: 'bg-pink-50', icon: 'text-pink-600', badge: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
  'home-and-living': { bg: 'bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  beauty: { bg: 'bg-rose-50', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
};

export default function CategoriesPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const parentCategories = categories.filter((c) => !c.parentId);

  const handleCategoryClick = (slug: string) => {
    navigate('shop', { category: slug });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LoadingState type="product-card" count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop by Category</h1>
        <p className="text-gray-500 mt-1">Browse our wide selection of product categories</p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {parentCategories.map((parent) => {
          const children = categories.filter((c) => c.parentId === parent.id);
          const IconComponent = CATEGORY_ICONS[parent.slug] || Smartphone;
          const colors = CATEGORY_COLORS[parent.slug] || {
            bg: 'bg-gray-50',
            icon: 'text-gray-600',
            badge: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          };
          const totalProducts = parent._count.products + children.reduce((sum, c) => sum + c._count.products, 0);

          return (
            <div key={parent.id} className="group">
              {/* Parent Card */}
              <button
                onClick={() => handleCategoryClick(parent.slug)}
                className={`w-full text-left rounded-xl border border-gray-200 ${colors.bg} p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300`}
              >
                <div className={`h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <h2 className="font-semibold text-gray-900 text-base sm:text-lg">{parent.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
                </p>
              </button>

              {/* Child Categories */}
              {children.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleCategoryClick(child.slug)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors.badge} transition-colors`}
                    >
                      {child.name}
                      <span className="text-[10px] opacity-70">({child._count.products})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
