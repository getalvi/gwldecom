'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { useUi } from '@/lib/ui-store'
import { api } from '@/lib/api'
import type { ProductT } from '@/lib/types'

/**
 * Recently viewed products section. Reads slugs from the persisted useUi store
 * and fetches the corresponding published products.
 */
export function RecentlyViewed({ excludeSlug, limit = 6 }: { excludeSlug?: string; limit?: number }) {
  const slugs = useUi((s) => s.recentlyViewed)
  const [items, setItems] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const filtered = excludeSlug
      ? slugs.filter((s) => s !== excludeSlug)
      : slugs
    if (!filtered.length) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all(
      filtered.slice(0, limit).map((s) =>
        api<ProductT>(`/api/products/${s}`).catch(() => null)
      )
    ).then((results) => {
      setItems(results.filter(Boolean) as ProductT[])
      setLoading(false)
    })
  }, [slugs, excludeSlug, limit])

  if (!slugs.length) return null
  if (!loading && items.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-brand-500" />
          <h2 className="text-lg font-bold text-ink-900 sm:text-xl">Recently Viewed</h2>
        </div>
        <Link href="#/search" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Browse all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {loading
          ? Array.from({ length: Math.min(6, limit) }).map((_, i) => <ProductCardSkeleton key={i} />)
          : items.slice(0, limit).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
