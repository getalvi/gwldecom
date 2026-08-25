'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Plus, ShoppingCart, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, formatBDT } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { useToast } from '@/hooks/use-toast'
import type { ProductT } from '@/lib/types'

type Bundle = {
  id: string
  title: string
  slug: string
  description: string | null
  discountPct: number
  items: Array<{
    product: ProductT
  }>
}

export function BundleDealsSection() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()

  useEffect(() => {
    api<{ items: Bundle[] }>('/api/bundles')
      .then((r) => setBundles(r.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function addBundle(bundle: Bundle) {
    for (const item of bundle.items) {
      const p = item.product
      if (!p || p.stockQuantity <= 0) continue
      addToCart({
        productId: p.id,
        title: p.title,
        slug: p.slug,
        price: p.price,
        quantity: 1,
        image: p.images?.[0]?.url || null,
        stock: p.stockQuantity,
      })
    }
    toast({ title: 'Bundle added to cart!', description: `${bundle.title} — ${bundle.discountPct}% off applied at checkout` })
    openCart()
  }

  if (loading) return null
  if (!bundles.length) return null

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Package size={18} className="text-brand-500" />
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">Bundle Deals</h2>
        <span className="text-xs text-ink-400">Buy together &amp; save</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {bundles.map((bundle) => {
          const total = bundle.items.reduce((s, i) => s + (i.product?.price || 0), 0)
          const discounted = total * (1 - bundle.discountPct / 100)
          const saving = total - discounted
          return (
            <Card key={bundle.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 bg-brand-50/50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-ink-900">{bundle.title}</h3>
                  {bundle.description ? (
                    <p className="text-xs text-ink-500">{bundle.description}</p>
                  ) : null}
                </div>
                <Badge className="bg-brand-500 text-white">-{bundle.discountPct}%</Badge>
              </div>
              <div className="p-4">
                {/* product chain */}
                <div className="flex flex-wrap items-center gap-2">
                  {bundle.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {i > 0 ? <Plus size={14} className="text-ink-300" /> : null}
                      <Link
                        href={`#/product/${item.product.slug}`}
                        className="group flex flex-col items-center"
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                          {item.product.images?.[0]?.url ? (
                            <img src={item.product.images[0].url} alt={item.product.title} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-1 max-w-[80px] text-[10px] text-ink-600 group-hover:text-brand-600">
                          {item.product.title}
                        </p>
                        <p className="text-[10px] font-bold text-brand-600">{formatBDT(item.product.price)}</p>
                      </Link>
                    </div>
                  ))}
                </div>
                {/* totals + CTA */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-50/60 p-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-brand-600">{formatBDT(discounted)}</span>
                      <span className="text-xs text-ink-400 line-through">{formatBDT(total)}</span>
                    </div>
                    <p className="text-[11px] font-medium text-emerald-600">You save {formatBDT(saving)}</p>
                  </div>
                  <Button size="sm" onClick={() => addBundle(bundle)} className="bg-brand-500 hover:bg-brand-600">
                    <ShoppingCart size={13} className="mr-1" /> Add Bundle
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
