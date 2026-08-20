'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Package,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProductCard from '@/components/shared/ProductCard';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { useNavigationStore } from '@/lib/store';
import { PRODUCT_SORT_OPTIONS, CURRENCY_SYMBOL } from '@/lib/constants';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count: { products: number; children: number };
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface Product {
  id: string;
  title: string;
  slug?: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string; altText?: string; position: number }[];
  category?: { name: string; slug: string };
  brand?: { name: string };
  avgRating?: number;
  reviewCount?: number;
  stockQuantity?: number;
  isFeatured?: boolean;
}

const POPULAR_SEARCHES = ['Smartphones', 'Laptops', 'T-Shirts', 'Watches', 'Headphones'];

export default function SearchPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const viewParams = useNavigationStore((s) => s.viewParams);
  const query = viewParams.q || '';

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  // Fetch categories and brands for filters
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ]).then(([catData, brandData]) => {
      setCategories(catData.categories || []);
      setBrands(brandData.brands || []);
    });
  }, []);

  // Fetch featured products for the no-query state
  useEffect(() => {
    if (!query) {
      fetch('/api/products?status=published&isFeatured=true&limit=8')
        .then((r) => r.json())
        .then((data) => {
          setFeaturedProducts(data.products || []);
          setInitialLoading(false);
        })
        .catch(() => setInitialLoading(false));
    }
  }, [query]);

  // Build search params
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('limit', '12');
    if (sort) params.set('sort', sort);
    if (categoryFilter) params.set('category', categoryFilter);
    if (brandFilter) params.set('brand', brandFilter);
    if (appliedMinPrice) params.set('minPrice', appliedMinPrice);
    if (appliedMaxPrice) params.set('maxPrice', appliedMaxPrice);
    return params.toString();
  }, [query, page, sort, categoryFilter, brandFilter, appliedMinPrice, appliedMaxPrice]);

  // Fetch search results
  const fetchResults = useCallback(async (p?: number) => {
    if (!query) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('page', String(p ?? page));
      params.set('limit', '12');
      if (sort) params.set('sort', sort);
      if (categoryFilter) params.set('category', categoryFilter);
      if (brandFilter) params.set('brand', brandFilter);
      if (appliedMinPrice) params.set('minPrice', appliedMinPrice);
      if (appliedMaxPrice) params.set('maxPrice', appliedMaxPrice);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (p) setPage(p);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [query, page, sort, categoryFilter, brandFilter, appliedMinPrice, appliedMaxPrice]);

  // Re-fetch when query or filters change
  useEffect(() => {
    if (query) {
      setPage(1);
      fetchResults(1);
    }
  }, [query, sort, categoryFilter, brandFilter, appliedMinPrice, appliedMaxPrice, fetchResults]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchResults(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyPrice = () => {
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
  };

  const handleClearFilters = () => {
    setSort('newest');
    setCategoryFilter('');
    setBrandFilter('');
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setPage(1);
  };

  const handlePopularSearch = (term: string) => {
    navigate('search', { q: term });
  };

  const hasActiveFilters =
    categoryFilter || brandFilter || appliedMinPrice || appliedMaxPrice || sort !== 'newest';

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // All categories (flat list for select)
  const allCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  // No query state - show popular searches and featured products
  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {initialLoading ? (
          <LoadingState type="product-card" count={8} />
        ) : (
          <>
            {/* Search Prompt */}
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Products</h1>
              <p className="text-gray-500 mb-8">Find exactly what you&apos;re looking for</p>

              {/* Popular Searches */}
              <div className="max-w-xl mx-auto">
                <p className="text-sm font-medium text-gray-500 mb-3 flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Popular Searches
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => handlePopularSearch(term)}
                      className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Featured Products</h2>
                  <button
                    onClick={() => navigate('shop')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featuredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      title={product.title}
                      slug={product.slug}
                      price={product.price}
                      compareAtPrice={product.compareAtPrice}
                      images={product.images?.map((img) => img.url)}
                      category={product.category?.name}
                      avgRating={product.avgRating}
                      reviewCount={product.reviewCount}
                      stockQuantity={product.stockQuantity}
                      isFeatured={product.isFeatured}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Search results view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Search results for &ldquo;{query}&rdquo;
        </h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'result' : 'results'} found
          </p>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Category Select */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => {
                  const children = childCategories.filter((c) => c.parentId === cat.id);
                  return (
                    <React.Fragment key={cat.id}>
                      <SelectItem value={cat.id}>{cat.name}</SelectItem>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          &nbsp;&nbsp;↳ {child.name}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Select */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Brand</label>
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sort By</label>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="sm:col-span-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Price Range ({CURRENCY_SYMBOL})</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9 text-sm"
                min="0"
              />
              <span className="text-gray-300 text-xs">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9 text-sm"
                min="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApplyPrice}
            >
              Apply
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-gray-500 hover:text-red-600"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && products.length === 0 ? (
        <LoadingState type="product-card" count={8} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No results found"
          description={`We couldn't find any products matching "${query}". Try different keywords or clear your filters.`}
          actionLabel="Browse Shop"
          actionView="shop"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                slug={product.slug}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                images={product.images?.map((img) => img.url)}
                category={product.category?.name}
                avgRating={product.avgRating}
                reviewCount={product.reviewCount}
                stockQuantity={product.stockQuantity}
                isFeatured={product.isFeatured}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    className={
                      page === p
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
