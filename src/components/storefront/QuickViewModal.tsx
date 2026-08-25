'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Check,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Price } from '@/components/storefront/Price'
import { StarRating } from '@/components/storefront/StarRating'
import { api, formatBDT } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { useToast } from '@/hooks/use-toast'
import type { ProductT } from '@/lib/types'

export function QuickViewModal() {
  // QuickView uses a dedicated dialog driven by a local store-ish pattern
  // piggybacked on useUi via a custom event. Simpler: this component renders
  // only when a slug is set via the `quickViewSlug` state we add to useUi.
  const [slug, setSlug] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductT & { related?: ProductT[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      setSlug(detail)
      setActiveImg(0)
      setQty(1)
      setLoading(true)
      api<ProductT & { related?: ProductT[] }>(`/api/products/${detail}`)
        .then(setProduct)
        .finally(() => setLoading(false))
    }
    window.addEventListener('bdshop:quickview', onOpen as EventListener)
    return () => window.removeEventListener('bdshop:quickview', onOpen as EventListener)
  }, [])

  function close() {
    setSlug(null)
    setProduct(null)
  }

  function handleAddToCart() {
    if (!product) return
    addToCart({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      quantity: qty,
      image: product.images?.[0]?.url || null,
      stock: product.stockQuantity,
    })
    toast({ title: 'Added to cart', description: `${qty} × ${product.title}` })
    close()
    openCart()
  }

  return (
    <Dialog open={!!slug} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogClose asChild>
          <button
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-ink-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-ink-900"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </DialogClose>

        {loading ? (
          <div className="grid h-72 place-items-center">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : product ? (
          <div className="grid gap-0 sm:grid-cols-2">
            {/* gallery */}
            <div className="relative aspect-square bg-ink-50 sm:aspect-auto">
              {product.images?.[activeImg] ? (
                 
                <img
                  src={product.images[activeImg].url}
                  alt={product.images[activeImg].altText || product.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                <Badge className="absolute left-3 top-3 bg-brand-500 text-white">
                  -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                </Badge>
              ) : null}
              {product.images && product.images.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImg(i)}
                      className={`h-12 w-12 overflow-hidden rounded-md border-2 transition ${
                        i === activeImg ? 'border-white shadow' : 'border-white/60'
                      }`}
                    >
                      { }
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* info */}
            <div className="flex max-h-[70vh] flex-col overflow-y-auto p-5 scroll-thin">
              {product.brand?.name ? (
                <Link
                  href={`#/search?brand=${product.brand.slug}`}
                  className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 hover:underline"
                >
                  {product.brand.name}
                </Link>
              ) : null}
              <h2 className="mt-1 text-lg font-bold leading-snug text-ink-900">{product.title}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <StarRating value={0} />
                <span className="text-xs text-ink-400">SKU: {product.sku}</span>
              </div>

              <div className="mt-3">
                <Price price={product.price} compareAt={product.compareAtPrice} size="lg" />
              </div>

              <div className="mt-3 flex items-center gap-2">
                {product.stockQuantity > 0 ? (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                    <Check size={11} className="mr-1" /> In Stock
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-50 text-red-700">Out of Stock</Badge>
                )}
              </div>

              {product.description ? (
                <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-ink-600">
                  {product.description}
                </p>
              ) : null}

              {/* qty */}
              <div className="mt-4">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Quantity
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={12} />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-5 flex gap-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity <= 0}
                  className="flex-1 bg-brand-500 hover:bg-brand-600"
                >
                  <ShoppingCart size={14} className="mr-1.5" /> Add to Cart
                </Button>
                <Link href={`#/product/${product.slug}`}>
                  <Button
                    variant="outline"
                    className="border-brand-500 text-brand-600 hover:bg-brand-50"
                    onClick={close}
                  >
                    Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Helper to open the quick view from anywhere */
export function openQuickView(slug: string) {
  window.dispatchEvent(new CustomEvent('bdshop:quickview', { detail: slug }))
}
