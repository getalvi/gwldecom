'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  Star,
  Shield,
  RotateCcw,
  Check,
  AlertCircle,
  ChevronRight,
  Loader2,
  ImageOff,
  PackageX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import ProductCard from '@/components/shared/ProductCard';
import RatingStars from '@/components/shared/RatingStars';
import PriceDisplay from '@/components/shared/PriceDisplay';
import LoadingState from '@/components/shared/LoadingState';
import { useNavigationStore, useCartStore, useAuthStore } from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stockQuantity?: number;
  attributes: string;
  image?: string;
  position: number;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  verified: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  sku?: string;
  specifications?: string;
  tags?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category?: { id: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string; logo?: string } | null;
  avgRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  reviews: Review[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
}

interface RelatedProduct {
  id: string;
  title: string;
  slug?: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  category?: { name: string; slug: string } | null;
  brand?: { name: string } | null;
  avgRating?: number;
  reviewCount?: number;
  stockQuantity?: number;
  isFeatured?: boolean;
}

export default function ProductDetailPage() {
  const viewParams = useNavigationStore((s) => s.viewParams);
  const navigate = useNavigationStore((s) => s.navigate);
  const goBack = useNavigationStore((s) => s.goBack);
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const productId = viewParams.id;

  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Variant selection
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Wishlist
  const [isWished, setIsWished] = useState(false);

  // Related products
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // ─── Fetch product ──────────────────────────────
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError('');
    fetch(`/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setProduct(data.product);
        // Fetch related products
        if (data.product.categoryId) {
          fetch(`/api/products?status=published&category=${data.product.categoryId}&limit=5`)
            .then((r) => r.json())
            .then((rd) => {
              setRelatedProducts(
                (rd.products || []).filter(
                  (p: RelatedProduct) => p.id !== productId
                ).slice(0, 4)
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [productId]);

  // Reset state when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedAttributes({});
    setQuantity(1);
    setReviewRating(0);
    setReviewTitle('');
    setReviewBody('');
  }, [productId]);

  // ─── Variant logic ──────────────────────────────

  // Parse all unique attribute groups from variants
  const attributeGroups = useMemo(() => {
    if (!product?.variants?.length) return {};
    const groups: Record<string, string[]> = {};
    for (const v of product.variants) {
      try {
        const attrs = JSON.parse(v.attributes || '{}');
        for (const [key, value] of Object.entries(attrs)) {
          if (!groups[key]) groups[key] = [];
          if (value && !groups[key].includes(String(value))) {
            groups[key].push(String(value));
          }
        }
      } catch {
        // skip malformed JSON
      }
    }
    return groups;
  }, [product?.variants]);

  const attributeGroupNames = Object.keys(attributeGroups);

  // Find matching variant based on selected attributes
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    if (attributeGroupNames.length === 0) return null;

    // Check if all attribute groups have a selection
    const allSelected = attributeGroupNames.every(
      (key) => selectedAttributes[key]
    );
    if (!allSelected) return null;

    return product.variants.find((v) => {
      try {
        const attrs = JSON.parse(v.attributes || '{}');
        return attributeGroupNames.every(
          (key) => attrs[key] === selectedAttributes[key]
        );
      } catch {
        return false;
      }
    });
  }, [product?.variants, selectedAttributes, attributeGroupNames]);

  // Determine effective price and stock
  const effectivePrice = selectedVariant?.price
    ? selectedVariant.price
    : product?.price ?? 0;
  const effectiveStock = selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const isOutOfStock = effectiveStock === 0;
  const isLowStock = !isOutOfStock && effectiveStock <= 5;
  const maxQuantity = effectiveStock;

  // Update main image when variant has image
  useEffect(() => {
    if (selectedVariant?.image && product?.images) {
      const idx = product.images.findIndex((img) => img.url === selectedVariant.image);
      if (idx >= 0) setSelectedImageIndex(idx);
    }
  }, [selectedVariant, product?.images]);

  // ─── Handlers ──────────────────────────────────

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQuantity, prev + delta)));
  };

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      productName: product.title,
      productImage:
        selectedVariant?.image ||
        product.images?.[0]?.url ||
        '',
      variantName: selectedVariant?.name,
      quantity,
      unitPrice: effectivePrice,
      stock: effectiveStock,
    });
    toast.success('Added to cart', {
      description: `${product.title}${selectedVariant ? ` (${selectedVariant.name})` : ''} × ${quantity}`,
    });
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to your wishlist');
      return;
    }
    setIsWished(!isWished);
    if (!isWished) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        toast.success('Added to wishlist');
      } catch {
        toast.error('Failed to add to wishlist');
        setIsWished(false);
      }
    } else {
      try {
        await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        toast.success('Removed from wishlist');
      } catch {
        toast.error('Failed to remove from wishlist');
        setIsWished(true);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to write a review');
      navigate('login');
      return;
    }
    if (reviewRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!product) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle || undefined,
          body: reviewBody || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit review');
        return;
      }
      toast.success('Review submitted successfully!');
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
      // Refresh product to get updated reviews
      const prodRes = await fetch(`/api/products/${productId}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProduct(prodData.product);
      }
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ─── Render ────────────────────────────────────

  if (loading) return <LoadingState type="detail" />;
  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <PackageX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => navigate('shop')}>Browse Shop</Button>
      </div>
    );
  }

  const allImages = product.images?.length > 0
    ? product.images
    : [{ id: 'placeholder', url: '', altText: product.title, position: 0 }];

  const specMap: Record<string, string> = {};
  if (product.specifications) {
    try {
      Object.assign(specMap, JSON.parse(product.specifications));
    } catch {
      // skip
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6 flex-wrap">
        <button
          onClick={() => navigate('home')}
          className="hover:text-gray-900 transition-colors"
        >
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          onClick={() => navigate('shop')}
          className="hover:text-gray-900 transition-colors"
        >
          Shop
        </button>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <button
              onClick={() => navigate('shop', { category: product.category!.id })}
              className="hover:text-gray-900 transition-colors"
            >
              {product.category.name}
            </button>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium truncate max-w-xs">
          {product.title}
        </span>
      </nav>

      {/* Main Product Section */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            {allImages[selectedImageIndex]?.url ? (
              <img
                src={allImages[selectedImageIndex].url}
                alt={allImages[selectedImageIndex].altText || product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-100">
                <span className="text-6xl font-bold text-emerald-200">
                  {product.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                    selectedImageIndex === idx
                      ? 'border-emerald-600 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.altText || `Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageOff className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="space-y-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {product.brand.name}
            </p>
          )}

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {product.title}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <RatingStars
              rating={product.avgRating}
              size="md"
              showCount
              count={product.reviewCount}
            />
          </div>

          {/* Price */}
          <PriceDisplay
            price={effectivePrice}
            compareAtPrice={product.compareAtPrice}
            className="text-xl"
          />

          {/* Short Description */}
          {product.shortDesc && (
            <p className="text-gray-600 leading-relaxed mt-4">
              {product.shortDesc}
            </p>
          )}

          {/* Stock Status */}
          <div>
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertCircle className="h-4 w-4" />
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Only {effectiveStock} left in stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" />
                In Stock
              </span>
            )}
          </div>

          {/* Variant Selector */}
          {attributeGroupNames.length > 0 && (
            <div className="space-y-4 pt-2">
              {attributeGroupNames.map((group) => (
                <div key={group}>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    {group}{!selectedAttributes[group] && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attributeGroups[group].map((value) => {
                      const isSelected = selectedAttributes[group] === value;
                      // Check if this value is available for selection
                      return (
                        <button
                          key={value}
                          onClick={() =>
                            setSelectedAttributes((prev) => ({
                              ...prev,
                              [group]: value,
                            }))
                          }
                          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Variant-specific info */}
              {selectedVariant && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Selected:</span>{' '}
                  {selectedVariant.name}
                  {selectedVariant.sku && (
                    <span className="text-gray-400 ml-2">
                      SKU: {selectedVariant.sku}
                    </span>
                  )}
                  {selectedVariant.stockQuantity === 0 && (
                    <span className="text-red-600 ml-2 font-medium">
                      — Out of Stock
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Quantity + Add to Cart */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="h-11 w-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && val <= maxQuantity) setQuantity(val);
                }}
                className="h-11 w-14 text-center border-0 border-x border-gray-300 rounded-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
                max={maxQuantity}
              />
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= maxQuantity}
                className="h-11 w-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="flex-1 sm:w-auto sm:flex-[3] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-11 text-base font-semibold"
              disabled={isOutOfStock || (attributeGroupNames.length > 0 && !selectedVariant)}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {isOutOfStock
                ? 'Out of Stock'
                : attributeGroupNames.length > 0 && !selectedVariant
                  ? 'Select Options'
                  : 'Add to Cart'}
            </Button>

            {/* Wishlist */}
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-11 p-0 shrink-0 rounded-lg"
              onClick={handleWishlistToggle}
            >
              <Heart
                className={`h-5 w-5 ${
                  isWished
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400'
                }`}
              />
            </Button>
          </div>

          <Separator />

          {/* Shipping Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Truck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900">Free Shipping</p>
                <p className="text-xs text-gray-500">Over ৳5,000</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <RotateCcw className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900">Easy Returns</p>
                <p className="text-xs text-gray-500">Within 7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Shield className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900">Authentic</p>
                <p className="text-xs text-gray-500">100% Genuine</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below Fold: Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-900 pb-3 px-4 text-sm font-medium"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-900 pb-3 px-4 text-sm font-medium"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-900 pb-3 px-4 text-sm font-medium"
            >
              Reviews ({product.reviewCount})
            </TabsTrigger>
          </TabsList>

          {/* Description Tab */}
          <TabsContent value="description" className="pt-6">
            {product.description ? (
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
            ) : (
              <p className="text-gray-400">No description available.</p>
            )}
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specifications" className="pt-6">
            {Object.keys(specMap).length > 0 ? (
              <div className="max-w-2xl">
                <table className="w-full">
                  <tbody>
                    {Object.entries(specMap).map(([key, value], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 w-1/3 border border-gray-100">
                          {key}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 border border-gray-100">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">No specifications available.</p>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="pt-6">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Rating Summary */}
              <div className="md:col-span-1">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-gray-900">
                    {product.avgRating.toFixed(1)}
                  </div>
                  <div className="mt-2">
                    <RatingStars rating={product.avgRating} size="lg" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Based on {product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = product.ratingDistribution?.[star] || 0;
                    const pct = product.reviewCount > 0
                      ? (count / product.reviewCount) * 100
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 w-8 text-right">{star}★</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List + Form */}
              <div className="md:col-span-2 space-y-6">
                {/* Review Form */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
                  {!isAuthenticated ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-3">
                        Please login to write a review.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate('login')}
                      >
                        Login
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Clickable Stars */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          Your Rating
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="p-0.5 transition-transform hover:scale-110"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= reviewRating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          Title
                        </label>
                        <Input
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="Summarize your experience"
                          className="max-w-md"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          Your Review
                        </label>
                        <Textarea
                          value={reviewBody}
                          onChange={(e) => setReviewBody(e.target.value)}
                          placeholder="Tell others what you think about this product..."
                          rows={4}
                          className="max-w-lg"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || reviewRating === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {submittingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Submit Review
                      </Button>
                    </div>
                  )}
                </div>

                {/* Individual Reviews */}
                {product.reviews?.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border border-gray-200 rounded-xl p-5"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-emerald-700">
                              {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {review.user?.name || 'Anonymous'}
                              </span>
                              {review.verified && (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-50 text-emerald-700 text-xs border-emerald-200"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Verified Purchase
                                </Badge>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>

                            <div className="mt-1.5">
                              <RatingStars rating={review.rating} size="sm" />
                            </div>

                            {review.title && (
                              <h4 className="text-sm font-semibold text-gray-900 mt-2">
                                {review.title}
                              </h4>
                            )}

                            {review.body && (
                              <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                                {review.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    No reviews yet. Be the first to review this product!
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((rp) => (
              <ProductCard
                key={rp.id}
                id={rp.id}
                title={rp.title}
                slug={rp.slug}
                price={rp.price}
                compareAtPrice={rp.compareAtPrice}
                images={rp.images?.map((img) => img.url)}
                category={rp.category?.name}
                avgRating={rp.avgRating}
                reviewCount={rp.reviewCount}
                stockQuantity={rp.stockQuantity}
                isFeatured={rp.isFeatured}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
