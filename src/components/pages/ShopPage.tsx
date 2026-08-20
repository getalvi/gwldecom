'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { PRODUCT_SORT_OPTIONS } from '@/lib/constants';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent?: { id: string; name: string; slug: string } | null;
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

export default function ShopPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const viewParams = useNavigationStore((s) => s.viewParams);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [page, setPage] = useState(1);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // Read initial params from URL hash
  useEffect(() => {
    if (viewParams.category) setSelectedCategories(viewParams.category.split(','));
    if (viewParams.brand) setSelectedBrands(viewParams.brand.split(','));
    if (viewParams.search) setSearch(viewParams.search);
    if (viewParams.sort) setSort(viewParams.sort);
    if (viewParams.minPrice) {
      setMinPrice(viewParams.minPrice);
      setAppliedMinPrice(viewParams.minPrice);
    }
    if (viewParams.maxPrice) {
      setMaxPrice(viewParams.maxPrice);
      setAppliedMaxPrice(viewParams.maxPrice);
    }
    if (viewParams.page) setPage(parseInt(viewParams.page, 10) || 1);
  }, []);

  // Build query params
  const buildParams = useCallback(
    (overridePage?: number) => {
      const params: Record<string, string> = { status: 'published' };
      if (selectedCategories.length > 0) params.category = selectedCategories.join(',');
      if (selectedBrands.length > 0) params.brand = selectedBrands.join(',');
      if (search) params.search = search;
      if (sort) params.sort = sort;
      if (appliedMinPrice) params.minPrice = appliedMinPrice;
      if (appliedMaxPrice) params.maxPrice = appliedMaxPrice;
      params.page = String(overridePage ?? page);
      params.limit = '12';
      return params;
    },
    [selectedCategories, selectedBrands, search, sort, appliedMinPrice, appliedMaxPrice, page]
  );

  // Fetch products
  const fetchProducts = useCallback(async (p?: number) => {
    setLoading(true);
    try {
      const params = buildParams(p);
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/products?${qs}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (p) setPage(p);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Fetch categories and brands
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ]).then(([catData, brandData]) => {
      setCategories(catData.categories || []);
      setBrands(brandData.brands || []);
    });
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update hash when filters change
  const updateHash = useCallback(
    (p?: number) => {
      const params: Record<string, string> = {};
      if (selectedCategories.length > 0) params.category = selectedCategories.join(',');
      if (selectedBrands.length > 0) params.brand = selectedBrands.join(',');
      if (search) params.search = search;
      if (sort !== 'newest') params.sort = sort;
      if (appliedMinPrice) params.minPrice = appliedMinPrice;
      if (appliedMaxPrice) params.maxPrice = appliedMaxPrice;
      const currentPage = p ?? page;
      if (currentPage > 1) params.page = String(currentPage);
      navigate('shop', params);
    },
    [selectedCategories, selectedBrands, search, sort, appliedMinPrice, appliedMaxPrice, page, navigate]
  );

  // Filter change handlers
  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
    setPage(1);
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId]
    );
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handleApplyPrice = () => {
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
    setPage(1);
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setSearch('');
    setSort('newest');
    setPage(1);
    setFilterOpen(false);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchProducts(p);
    updateHash(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    appliedMinPrice ||
    appliedMaxPrice;

  // Build category hierarchy
  const parentCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  // Sidebar content (shared between desktop and mobile)
  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-1">
          {/* Show parent-less categories that have children */}
          {parentCategories.map((parent) => {
            const children = childCategories.filter((c) => c.parentId === parent.id);
            if (children.length > 0) {
              return (
                <div key={parent.id}>
                  <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                    <Checkbox
                      checked={selectedCategories.includes(parent.id)}
                      onCheckedChange={() => handleCategoryToggle(parent.id)}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 flex-1">
                      {parent.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {parent._count.products}
                    </span>
                  </label>
                  <div className="ml-6 space-y-1">
                    {children.map((child) => (
                      <label
                        key={child.id}
                        className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
                      >
                        <Checkbox
                          checked={selectedCategories.includes(child.id)}
                          onCheckedChange={() => handleCategoryToggle(child.id)}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                          {child.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {child._count.products}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <label
                key={parent.id}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
              >
                <Checkbox
                  checked={selectedCategories.includes(parent.id)}
                  onCheckedChange={() => handleCategoryToggle(parent.id)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                  {parent.name}
                </span>
                <span className="text-xs text-gray-400">
                  {parent._count.products}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Brands */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Brands</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {brands.map((brand) => (
            <label
              key={brand.id}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
            >
              <Checkbox
                checked={selectedBrands.includes(brand.id)}
                onCheckedChange={() => handleBrandToggle(brand.id)}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                {brand.name}
              </span>
              <span className="text-xs text-gray-400">
                {brand._count.products}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-9 text-sm"
            min="0"
          />
          <span className="text-gray-400 text-sm">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-9 text-sm"
            min="0"
          />
        </div>
        <Button
          size="sm"
          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleApplyPrice}
        >
          Apply
        </Button>
      </div>

      <Separator />

      {/* Clear All */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleClearAll}
        >
          <X className="h-4 w-4 mr-1" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  // Pagination numbers
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile filter button */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-emerald-600 text-white text-xs rounded-full">
                    {selectedCategories.length + selectedBrands.length + (appliedMinPrice || appliedMaxPrice ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>

          {/* Results count */}
          <p className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium text-gray-900">
              {loading ? '...' : products.length}
            </span>{' '}
            of <span className="font-medium text-gray-900">{total}</span> products
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-44 h-9">
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

          {/* Grid/List toggle (visual only) */}
          <div className="hidden sm:flex items-center border rounded-lg">
            <button className="p-2 bg-emerald-600 text-white rounded-l-lg">
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-r-lg">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {selectedCategories.map((catId) => {
            const cat = categories.find((c) => c.id === catId);
            return (
              <Badge
                key={catId}
                variant="secondary"
                className="gap-1 pr-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              >
                {cat?.name || catId}
                <button
                  onClick={() => handleCategoryToggle(catId)}
                  className="ml-1 hover:bg-emerald-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedBrands.map((brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            return (
              <Badge
                key={brandId}
                variant="secondary"
                className="gap-1 pr-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              >
                {brand?.name || brandId}
                <button
                  onClick={() => handleBrandToggle(brandId)}
                  className="ml-1 hover:bg-emerald-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {(appliedMinPrice || appliedMaxPrice) && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
            >
              ৳{appliedMinPrice || '0'} - ৳{appliedMaxPrice || '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setAppliedMinPrice('');
                  setAppliedMaxPrice('');
                  setPage(1);
                }}
                className="ml-1 hover:bg-emerald-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              {hasFilters && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              )}
            </div>
            <ScrollArea className="max-h-[calc(100vh-12rem)]">
              <FilterSidebar />
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <LoadingState type="product-card" count={8} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="Try adjusting your filters or search to find what you're looking for."
              actionLabel="Clear Filters"
              actionView="shop"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      </div>
    </div>
  );
}
