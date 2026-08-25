'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  X,
  Star,
  ShoppingCart,
  Trash2,
  GitCompareArrows,
  PlusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Price } from '@/components/storefront/Price'
import { StarRating } from '@/components/storefront/StarRating'
import { useCompare } from '@/lib/compare-store'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { ProductT } from '@/lib/types'

export function CompareView() {
  const slugs = useCompare((s) => s.slugs)
  const remove = useCompare((s) => s.remove)
  const clear = useCompare((s) => s.clear)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()
  const [items, setItems] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slugs.length) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    api<{ items: ProductT[] }>(
      `/api/compare?slugs=${encodeURIComponent(slugs.join(','))}`
    )
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false))
  }, [slugs])

  function quickAdd(p: ProductT) {
    addToCart({
      productId: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      quantity: 1,
      image: p.images?.[0]?.url || null,
      stock: p.stockQuantity,
    })
    toast({ title: 'Added to cart', description: p.title })
    openCart()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-ink-400">
        Loading comparison...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-ink-50">
          <GitCompareArrows size={36} className="text-ink-300" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">No products to compare</h1>
        <p className="mt-1 text-sm text-ink-400">
          Add up to 4 products to compare their features side by side.
        </p>
        <Button
          className="mt-6 bg-brand-500 hover:bg-brand-600"
          onClick={() => navigate('/')}
        >
          <PlusCircle size={16} className="mr-1" /> Browse Products
        </Button>
      </div>
    )
  }

  // Build the spec rows: union of all spec keys across products (preserve order).
  const specKeys: string[] = []
  for (const p of items) {
    const specs = (p.specifications as Record<string, string>) || {}
    for (const k of Object.keys(specs)) {
      if (!specKeys.includes(k)) specKeys.push(k)
    }
  }

  const rows: { label: string; render: (p: ProductT) => React.ReactNode }[] = [
    {
      label: 'Price',
      render: (p) => <Price price={p.price} compareAt={p.compareAtPrice} size="md" />,
    },
    {
      label: 'Rating',
      render: (p) => {
        const rs = (p as any).reviewStats as { avg: number; count: number } | undefined
        if (!rs || rs.count === 0) return <span className="text-xs text-ink-400">No reviews</span>
        return (
          <div className="flex flex-col items-center gap-1">
            <StarRating value={rs.avg} />
            <span className="text-[11px] text-ink-500">{rs.avg.toFixed(1)} ({rs.count})</span>
          </div>
        )
      },
    },
    {
      label: 'Brand',
      render: (p) => p.brand?.name || '—',
    },
    {
      label: 'Category',
      render: (p) => p.category?.name || '—',
    },
    {
      label: 'Availability',
      render: (p) =>
        p.stockQuantity > 0 ? (
          <Badge className="bg-emerald-50 text-emerald-700">
            <Check size={11} className="mr-1" /> In Stock
          </Badge>
        ) : (
          <Badge className="bg-red-50 text-red-700">Out of Stock</Badge>
        ),
    },
    ...specKeys.map((k) => ({
      label: k,
      render: (p: ProductT) => {
        const v = ((p.specifications as Record<string, string>) || {})[k]
        return v ? <span className="text-ink-700">{v}</span> : <span className="text-ink-300">—</span>
      },
    })),
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 sm:text-2xl">
            <GitCompareArrows className="text-brand-500" /> Product Comparison
          </h1>
          <p className="text-xs text-ink-400">{items.length} of 4 products</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clear} className="text-red-500 hover:text-red-600">
          <Trash2 size={14} className="mr-1" /> Clear All
        </Button>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[600px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-32 bg-white p-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                Product
              </th>
              {items.map((p) => (
                <th key={p.id} className="border-l border-ink-100 bg-white p-3 align-top">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="relative aspect-square w-full max-w-[140px] overflow-hidden rounded-lg bg-ink-50">
                      {p.images?.[0]?.url ? (
                         
                        <img src={p.images[0].url} alt={p.images[0].altText || p.title} className="h-full w-full object-cover" />
                      ) : null}
                      <button
                        onClick={() => remove(p.slug)}
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-ink-400 shadow-sm transition hover:text-red-500"
                        aria-label="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <Link
                      href={`#/product/${p.slug}`}
                      className="line-clamp-2 text-xs font-medium leading-snug text-ink-800 hover:text-brand-600"
                    >
                      {p.title}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.label} className={ri % 2 === 0 ? 'bg-ink-50/40' : ''}>
                <td className="sticky left-0 z-10 w-32 whitespace-nowrap p-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {row.label}
                </td>
                {items.map((p) => (
                  <td
                    key={p.id}
                    className="border-l border-ink-100 p-3 text-center align-middle text-sm"
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Add to cart row */}
            <tr>
              <td className="sticky left-0 z-10 w-32 bg-white p-3" />
              {items.map((p) => (
                <td key={p.id} className="border-l border-ink-100 bg-white p-3 text-center">
                  <Button
                    size="sm"
                    disabled={p.stockQuantity <= 0}
                    onClick={() => quickAdd(p)}
                    className="bg-brand-500 hover:bg-brand-600"
                  >
                    <ShoppingCart size={13} className="mr-1" /> Add to Cart
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
