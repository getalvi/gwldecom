'use client'
import { useEffect, useState } from 'react'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import type { ProductGridProps } from '@/lib/blocks/registry'
import type { ProductT } from '@/lib/types'
import { api } from '@/lib/api'

export function ProductGridBlock({ props }: { props: ProductGridProps }) {
  const [items, setItems] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const params = new URLSearchParams({ limit: String(props.limit || 8) })
    if (props.tag) params.set('tag', props.tag)
    if (props.category) params.set('category', props.category)
    api<{ items: ProductT[] }>(`/api/products?${params.toString()}`)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false))
  }, [props.tag, props.category, props.limit])

  return (
    <section className="py-2">
      {props.title ? (
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-bold text-ink-900 sm:text-xl">{props.title}</h2>
          <span className="h-1 flex-1 rounded bg-gradient-to-r from-brand-300 to-transparent" />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: props.limit || 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {!loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-400">No products found.</p>
      ) : null}
    </section>
  )
}
