'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Clock, TrendingDown, Mail, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

type Cart = {
  id: string
  userId: string | null
  sessionId: string | null
  items: Array<{ productId: string; title: string; price: number; quantity: number }>
  total: number
  itemCount: number
  createdAt: string
  updatedAt: string
  user?: { id: string; email: string; fullName: string | null } | null
}

export function AbandonedCartsView() {
  const [carts, setCarts] = useState<Cart[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    api<{ items: Cart[] }>('/api/abandoned-carts?limit=50')
      .then((r) => setCarts(r.items))
      .finally(() => setLoading(false))
  }, [])

  // Aggregate: most abandoned products
  const productCounts = new Map<string, { title: string; qty: number; cartCount: number }>()
  for (const c of carts) {
    for (const it of c.items || []) {
      const prev = productCounts.get(it.productId) || { title: it.title, qty: 0, cartCount: 0 }
      prev.qty += it.quantity
      prev.cartCount += 1
      productCounts.set(it.productId, prev)
    }
  }
  const topAbandoned = Array.from(productCounts.values()).sort((a, b) => b.qty - a.qty).slice(0, 5)
  const totalValue = carts.reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Abandoned Carts</h1>
        <p className="text-sm text-ink-400">Carts with items left unpurchased. Use for recovery outreach.</p>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Active Carts</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{carts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total Value</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">{formatBDT(totalValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Items in Carts</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {carts.reduce((s, c) => s + c.itemCount, 0)}
          </p>
        </Card>
      </div>

      {/* top abandoned products */}
      {topAbandoned.length > 0 ? (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <TrendingDown size={15} className="text-brand-500" /> Most Abandoned Products
          </h2>
          <div className="space-y-2">
            {topAbandoned.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </div>
                <p className="flex-1 truncate text-sm font-medium text-ink-900">{p.title}</p>
                <Badge className="bg-ink-50 text-ink-600">{p.qty} units</Badge>
                <span className="text-xs text-ink-400">{p.cartCount} cart(s)</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* carts list */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ShoppingCart size={15} className="text-brand-500" /> Recent Carts
        </h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-ink-400">Loading...</div>
        ) : carts.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingCart size={32} className="mx-auto mb-2 text-ink-200" />
            <p className="text-sm text-ink-400">No abandoned carts yet.</p>
            <p className="mt-1 text-xs text-ink-400">Carts will appear here when customers add items.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carts.map((c) => (
              <div key={c.id} className="rounded-lg border border-ink-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-ink-400" />
                    <span className="text-sm font-medium text-ink-900">
                      {c.user?.fullName || c.user?.email || 'Guest'}
                    </span>
                    {c.user ? (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Registered</Badge>
                    ) : (
                      <Badge className="bg-ink-50 text-ink-500 text-[10px]">Guest</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">
                      {c.itemCount} item(s) · {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-bold text-brand-600">{formatBDT(c.total)}</span>
                    {c.user?.email ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs text-ink-500"
                        onClick={() => {
                          window.location.href = `mailto:${c.user!.email}?subject=You left items in your cart&body=Hi ${c.user!.fullName || 'there'},%0D%0A%0D%0AYou left ${c.itemCount} item(s) worth ${formatBDT(c.total)} in your BDShop cart. Complete your purchase now!%0D%0A%0D%0AVisit: ${window.location.origin}`
                          toast({ title: 'Opening email client...' })
                        }}
                      >
                        <Mail size={12} /> Remind
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.items || []).slice(0, 5).map((it, i) => (
                    <span key={i} className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-600">
                      {it.title.slice(0, 25)}{it.title.length > 25 ? '...' : ''} ×{it.quantity}
                    </span>
                  ))}
                  {c.items.length > 5 ? (
                    <span className="text-[11px] text-ink-400">+{c.items.length - 5} more</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
