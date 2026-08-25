'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RefreshCw,
  Check,
  Star,
  ZoomIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Price } from '@/components/storefront/Price'
import { StarRating } from '@/components/storefront/StarRating'
import { ProductCard } from '@/components/storefront/ProductCard'
import { RecentlyViewed } from '@/components/storefront/RecentlyViewed'
import { ShareButtons } from '@/components/storefront/ShareButtons'
import { FrequentlyBoughtTogether } from '@/components/storefront/FrequentlyBoughtTogether'
import { ProductQAndA } from '@/components/storefront/ProductQAndA'
import { PriceHistoryChart } from '@/components/storefront/PriceHistoryChart'
import { useCart } from '@/lib/cart'
import { useSession } from '@/lib/session-store'
import { useUi } from '@/lib/ui-store'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import { formatBDT } from '@/lib/api'
import type { ProductT, ReviewT } from '@/lib/types'

export function ProductView({ slug }: { slug: string }) {
  const [product, setProduct] = useState<(ProductT & { related?: ProductT[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [reviews, setReviews] = useState<ReviewT[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  const addToCart = useCart((s) => s.addItem)
  const { user } = useSession()
  const pushRecent = useUi((s) => s.pushRecentlyViewed)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()

  useEffect(() => {
    // Reset UI state when the product slug changes (derived from props).

    setLoading(true)
    setActiveImg(0)
    setQty(1)
    setVariants({})
    api<ProductT & { related?: ProductT[] }>(`/api/products/${slug}`)
      .then((p) => {
        setProduct(p)
        pushRecent(slug)
        // default first variant
        if (p.attributes) {
          const v: Record<string, string> = {}
          for (const [k, vals] of Object.entries(p.attributes)) {
            if (vals?.length) v[k] = vals[0]
          }
          setVariants(v)
        }
      })
      .finally(() => setLoading(false))
  }, [slug, pushRecent])

  // fetch reviews once we have the product id
  useEffect(() => {
    if (!product?.id) return
    api<{ items: ReviewT[]; avg: number; count: number }>(
      `/api/reviews?productId=${product.id}`
    ).then((r) => {
      setReviews(r.items)
      setAvgRating(r.avg)
    })
  }, [product?.id])

  // check wishlist
  useEffect(() => {
    if (user && product?.id) {
      api<any[]>(`/api/wishlist`).then((items) => {
        setWishlisted(items.some((i) => i.productId === product.id))
      })
    }
  }, [user, product?.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-ink-100" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-ink-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
            <div className="h-10 w-1/2 animate-pulse rounded bg-ink-100" />
            <div className="h-24 animate-pulse rounded bg-ink-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-sm text-ink-400">Product not found.</p>
        <Button variant="link" onClick={() => navigate('/')}>Back to home</Button>
      </div>
    )
  }

  const inStock = product.stockQuantity > 0
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0

  function handleAddToCart() {
    addToCart({
      productId: product!.id,
      title: product!.title,
      slug: product!.slug,
      price: product!.price,
      quantity: qty,
      image: product!.images?.[0]?.url || null,
      variant: variants && Object.keys(variants).length ? variants : undefined,
      stock: product!.stockQuantity,
    })
    toast({ title: 'Added to cart', description: `${qty} × ${product!.title}` })
    openCart()
  }

  async function handleBuyNow() {
    handleAddToCart()
    navigate('/checkout')
  }

  async function toggleWishlist() {
    if (!user) {
      toast({ title: 'Please login first', variant: 'destructive' })
      navigate('/login')
      return
    }
    if (wishlisted) {
      await api(`/api/wishlist/${product!.id}`, { method: 'DELETE' })
      setWishlisted(false)
      toast({ title: 'Removed from wishlist' })
    } else {
      await api('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId: product!.id }),
      })
      setWishlisted(true)
      toast({ title: 'Added to wishlist' })
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1 text-xs text-ink-400">
        <Link href="#/" className="hover:text-brand-600">Home</Link>
        <ChevronRight size={12} />
        {product.category ? (
          <>
            <Link href={`#/category/${product.category.slug}`} className="hover:text-brand-600">
              {product.category.name}
            </Link>
            <ChevronRight size={12} />
          </>
        ) : null}
        <span className="truncate text-ink-600">{product.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_320px]">
        {/* Gallery */}
        <div>
          <div
            className="group relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-white"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = ((e.clientX - rect.left) / rect.width) * 100
              const y = ((e.clientY - rect.top) / rect.height) * 100
              setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
            }}
          >
            {product.images?.[activeImg] ? (
               
              <img
                src={product.images[activeImg].url}
                alt={product.images[activeImg].altText || product.title}
                className="h-full w-full object-cover transition-transform duration-200"
                style={
                  zoom
                    ? {
                        transform: 'scale(2)',
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      }
                    : undefined
                }
              />
            ) : null}
            {discount > 0 ? (
              <Badge className="absolute left-3 top-3 bg-brand-500 text-white">-{discount}%</Badge>
            ) : null}
            {product.images?.[activeImg] ? (
              <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                <ZoomIn size={12} /> Hover to zoom
              </div>
            ) : null}
          </div>
          {product.images && product.images.length > 1 ? (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImg ? 'border-brand-500' : 'border-ink-100 hover:border-ink-300'
                  }`}
                >
                  { }
                  <img src={img.url} alt={img.altText || ''} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div>
          {product.brand?.name ? (
            <Link
              href={`#/search?brand=${product.brand.slug}`}
              className="text-xs font-semibold uppercase tracking-wide text-brand-600 hover:underline"
            >
              {product.brand.name}
            </Link>
          ) : null}
          <h1 className="mt-1 text-xl font-bold leading-snug text-ink-900 sm:text-2xl">
            {product.title}
          </h1>

          <div className="mt-2 flex items-center gap-3">
            <StarRating value={avgRating} showValue count={reviews.length} />
            <span className="text-xs text-ink-300">|</span>
            <span className="text-xs text-ink-500">SKU: {product.sku}</span>
          </div>

          <div className="mt-4">
            <Price price={product.price} compareAt={product.compareAtPrice} size="lg" />
            {discount > 0 ? (
              <p className="mt-1 text-xs text-emerald-600">
                You save {formatBDT((product.compareAtPrice || 0) - product.price)} ({discount}%)
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {inStock ? (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                <Check size={12} className="mr-1" /> In Stock
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-50 text-red-700">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Variants */}
          {product.attributes && Object.keys(product.attributes).length > 0 ? (
            <div className="mt-5 space-y-4">
              {Object.entries(product.attributes).map(([key, vals]) => (
                <div key={key}>
                  <Label className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {key}: <span className="text-ink-900">{variants[key]}</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {vals.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVariants((s) => ({ ...s, [key]: v }))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          variants[key] === v
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-ink-200 text-ink-600 hover:border-ink-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Quantity */}
          <div className="mt-5">
            <Label className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Quantity
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus size={14} />
              </Button>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(product.stockQuantity, Number(e.target.value) || 1)))}
                className="h-9 w-16 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
              >
                <Plus size={14} />
              </Button>
              <span className="ml-2 text-xs text-ink-400">
                {product.stockQuantity} available
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleAddToCart}
              disabled={!inStock}
              size="lg"
              variant="outline"
              className="flex-1 border-brand-500 text-brand-600 hover:bg-brand-50"
            >
              <ShoppingCart size={16} className="mr-2" /> Add to Cart
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={!inStock}
              size="lg"
              className="flex-1 bg-brand-500 hover:bg-brand-600"
            >
              Buy Now
            </Button>
            <Button
              onClick={toggleWishlist}
              size="lg"
              variant="outline"
              className="px-3"
              aria-label="Toggle wishlist"
            >
              <Heart size={18} className={wishlisted ? 'fill-brand-500 text-brand-500' : ''} />
            </Button>
          </div>

          {/* Share row */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-400">Share this product</span>
            <ShareButtons title={product.title} slug={product.slug} />
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ink-100 pt-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <Truck size={18} className="text-brand-600" />
              <span className="text-[10px] text-ink-500">Free Shipping<br />over ৳5000</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <ShieldCheck size={18} className="text-brand-600" />
              <span className="text-[10px] text-ink-500">Genuine<br />Product</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <RefreshCw size={18} className="text-brand-600" />
              <span className="text-[10px] text-ink-500">7-Day<br />Returns</span>
            </div>
          </div>
        </div>

        {/* Side: delivery */}
        <div className="lg:row-span-2">
          <div className="sticky top-32 space-y-4">
            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-900">Delivery Options</h3>
              <div className="space-y-3 text-xs text-ink-600">
                <div className="flex items-start gap-2">
                  <Truck size={16} className="mt-0.5 text-brand-600" />
                  <div>
                    <p className="font-medium text-ink-900">Standard Delivery</p>
                    <p>Dhaka: 24-48 hrs · Other: 2-5 days</p>
                    <p className="font-semibold text-brand-600">৳60</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 text-brand-600" />
                  <div>
                    <p className="font-medium text-ink-900">Cash on Delivery</p>
                    <p>Available nationwide</p>
                  </div>
                </div>
              </div>
              {/* Estimated delivery date */}
              <div className="mt-4 rounded-lg bg-brand-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                  <Truck size={13} /> Estimated Delivery
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-900">
                  {(() => {
                    const fmt = (d: Date) =>
                      d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
                    const earliest = new Date()
                    earliest.setDate(earliest.getDate() + 2)
                    const latest = new Date()
                    latest.setDate(latest.getDate() + 5)
                    return `${fmt(earliest)} – ${fmt(latest)}`
                  })()}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  Order in the next {Math.max(1, 24 - new Date().getHours())}h for fastest delivery
                </p>
              </div>
            </div>
            {/* Price history chart */}
            <PriceHistoryChart slug={product.slug} />
            {product.tags && product.tags.length > 0 ? (
              <div className="rounded-xl border border-ink-100 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold text-ink-900">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((t) => (
                    <Link
                      key={t}
                      href={`#/search?tag=${encodeURIComponent(t)}`}
                      className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-600 hover:bg-brand-50 hover:text-brand-600"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs: description / specs / reviews */}
      <Tabs defaultValue="description" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto bg-ink-50">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-4">
          <div className="prose prose-sm max-w-none text-ink-600">
            {product.description ? (
              <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
            ) : (
              <p className="text-ink-400">No description available.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="specs" className="mt-4">
          {product.specifications && Object.keys(product.specifications).length ? (
            <div className="overflow-hidden rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specifications).map(([k, v], i) => (
                    <tr key={k} className={i % 2 === 0 ? 'bg-ink-50' : 'bg-white'}>
                      <td className="w-1/3 px-4 py-2.5 font-medium text-ink-700">{k}</td>
                      <td className="px-4 py-2.5 text-ink-600">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-400">No specifications available.</p>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsSection productId={product.id} reviews={reviews} avg={avgRating} />
        </TabsContent>
        <TabsContent value="qa" className="mt-4">
          <ProductQAndA productId={product.id} slug={product.slug} />
        </TabsContent>
      </Tabs>

      {/* Frequently bought together */}
      <FrequentlyBoughtTogether mainProduct={product} />

      {/* Related */}
      {product.related && product.related.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {product.related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : null}

      {/* Recently viewed */}
      <RecentlyViewed excludeSlug={product.slug} limit={6} />
    </div>
  )
}

function ReviewsSection({
  productId,
  reviews,
  avg,
}: {
  productId: string
  reviews: ReviewT[]
  avg: number
}) {
  const { user } = useSession()
  const { toast } = useToast()
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Please login to review', variant: 'destructive' })
      return
    }
    try {
      const r = await api<ReviewT>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId, rating, title, body }),
      })
      toast({ title: 'Review submitted!' })
      setTitle('')
      setBody('')
      // refresh page data by reload trick
      window.location.reload()
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-400">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {(r.user?.fullName || 'A').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {r.user?.fullName || 'Anonymous'}
                      </p>
                      <p className="text-xs text-ink-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StarRating value={r.rating} />
                </div>
                {r.title ? <p className="mt-2 text-sm font-medium text-ink-800">{r.title}</p> : null}
                {r.body ? <p className="mt-1 text-sm text-ink-600">{r.body}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="mb-3 text-center">
            <p className="text-3xl font-bold text-ink-900">{avg.toFixed(1)}</p>
            <StarRating value={avg} size={16} />
            <p className="mt-1 text-xs text-ink-400">{reviews.length} reviews</p>
          </div>
          {user ? (
            <form onSubmit={submitReview} className="space-y-3 border-t border-ink-100 pt-4">
              <div>
                <Label className="mb-1.5 text-xs">Your Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-0.5"
                      aria-label={`${s} stars`}
                    >
                      <Star
                        size={22}
                        className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="rv-title" className="mb-1.5 text-xs">Title</Label>
                <Input
                  id="rv-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Great product!"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="rv-body" className="mb-1.5 text-xs">Review</Label>
                <Textarea
                  id="rv-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your experience..."
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600">
                Submit Review
              </Button>
            </form>
          ) : (
            <div className="border-t border-ink-100 pt-4 text-center">
              <p className="text-sm text-ink-500">Please login to write a review.</p>
              <Button variant="link" onClick={() => navigate('/login')} className="text-brand-600">
                Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
