'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, ShoppingBag, Star, GitCompareArrows } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Price } from './Price'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { useCompare, COMPARE_MAX } from '@/lib/compare-store'
import { useToast } from '@/hooks/use-toast'
import { openQuickView } from './QuickViewModal'
import type { ProductT } from '@/lib/types'

function productBadges(product: ProductT): { label: string; cls: string }[] {
  const out: { label: string; cls: string }[] = []
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0
  if (discount > 0) out.push({ label: `-${discount}%`, cls: 'bg-brand-500 text-white' })
  const tags = (product.tags as string[] | null) || []
  if (tags.includes('featured')) out.push({ label: 'Best Seller', cls: 'bg-amber-500 text-white' })
  const created = new Date(product.createdAt).getTime()
  if (Date.now() - created < 14 * 86400000) out.push({ label: 'New', cls: 'bg-emerald-500 text-white' })
  if (product.stockQuantity > 0 && product.stockQuantity <= 5) {
    out.push({ label: 'Low Stock', cls: 'bg-red-500 text-white' })
  }
  return out.slice(0, 3)
}

export function ProductCard({ product }: { product: any }) {
  const img = product.images?.[0]?.url
  const badges = productBadges(product)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const compareToggle = useCompare((s) => s.toggle)
  const compareSlugs = useCompare((s) => s.slugs)
  const inCompare = compareSlugs.includes(product.slug)
  const { toast } = useToast()

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addToCart({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      quantity: 1,
      image: product.images?.[0]?.url || null,
      stock: product.stockQuantity,
    })
    toast({ title: 'Added to cart', description: product.title })
    openCart()
  }

  function quickView(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    openQuickView(product.slug)
  }

  function toggleCompare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const added = compareToggle(product.slug)
    if (added) {
      toast({ title: 'Added to compare', description: `${product.title}` })
    } else if (inCompare) {
      toast({ title: 'Removed from compare' })
    } else {
      toast({
        title: `Compare full (${COMPARE_MAX} max)`,
        description: 'Remove one to add another.',
        variant: 'destructive',
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link href={`#/product/${product.slug}`} className="group block h-full">
        <Card className="group relative flex h-full flex-col overflow-hidden border-ink-100 transition-all duration-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1">
          <div className="relative aspect-square overflow-hidden bg-ink-50">
            {img ? (
               
              <img
                src={img}
                alt={product.images?.[0]?.altText || product.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-300 text-xs">
                No image
              </div>
            )}

            {/* badge stack */}
            {badges.length > 0 ? (
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                {badges.map((b, i) => (
                  <Badge key={i} className={`${b.cls} shadow-sm`}>{b.label}</Badge>
                ))}
              </div>
            ) : null}

            {/* quick actions — slide in on hover */}
            <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <button
                onClick={quickView}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink-600 shadow-md backdrop-blur transition hover:bg-white hover:text-brand-600"
                aria-label="Quick view"
                title="Quick view"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={quickAdd}
                disabled={product.stockQuantity <= 0}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink-600 shadow-md backdrop-blur transition hover:bg-white hover:text-brand-600 disabled:opacity-40"
                aria-label="Add to cart"
                title="Add to cart"
              >
                <ShoppingBag size={15} />
              </button>
              <button
                onClick={toggleCompare}
                className={`grid h-8 w-8 place-items-center rounded-full shadow-md backdrop-blur transition ${
                  inCompare
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'bg-white/95 text-ink-600 hover:bg-white hover:text-brand-600'
                }`}
                aria-label="Compare"
                title={inCompare ? 'Remove from compare' : 'Add to compare'}
              >
                <GitCompareArrows size={15} />
              </button>
            </div>

            {product.stockQuantity <= 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-ink-900">
                  Out of stock
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col p-3">
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-ink-800 transition-colors group-hover:text-brand-600">
              {product.title}
            </h3>
            {product.brand?.name ? (
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">
                {product.brand.name}
              </p>
            ) : null}
            {/* Rating row */}
            {(() => {
              const rs = product.reviewStats
              const avg = rs && typeof rs.avg === 'number' ? rs.avg : 0
              const count = rs && typeof rs.count === 'number' ? rs.count : 0
              if (count === 0) return null
              return (
                <div className="mt-1 flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-semibold text-ink-700">{avg.toFixed(1)}</span>
                  <span className="text-[11px] text-ink-400">({count})</span>
                </div>
              )
            })()}
            <div className="mt-auto pt-2">
              <Price price={product.price} compareAt={product.compareAtPrice} size="md" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border-ink-100">
      <div className="aspect-square animate-pulse bg-ink-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
      </div>
    </Card>
  )
}
