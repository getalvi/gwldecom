'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Check, ShoppingCart, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Price } from '@/components/storefront/Price'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { ProductT } from '@/lib/types'

type FbtItem = ProductT & { coOccurrence?: number }

export function FrequentlyBoughtTogether({ mainProduct }: { mainProduct: ProductT }) {
  const [items, setItems] = useState<FbtItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()

  useEffect(() => {
    setLoading(true)
    api<{ items: FbtItem[] }>(`/api/products/${mainProduct.slug}/related-purchases`)
      .then((r) => {
        setItems(r.items)
        // pre-select all by default
        setSelected(new Set(r.items.map((i) => i.id)))
      })
      .finally(() => setLoading(false))
  }, [mainProduct.slug])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedItems = items.filter((i) => selected.has(i.id))
  const total = mainProduct.price + selectedItems.reduce((s, i) => s + i.price, 0)

  function addAllToCart() {
    setAdding(true)
    addToCart({
      productId: mainProduct.id,
      title: mainProduct.title,
      slug: mainProduct.slug,
      price: mainProduct.price,
      quantity: 1,
      image: mainProduct.images?.[0]?.url || null,
      stock: mainProduct.stockQuantity,
    })
    for (const item of selectedItems) {
      addToCart({
        productId: item.id,
        title: item.title,
        slug: item.slug,
        price: item.price,
        quantity: 1,
        image: item.images?.[0]?.url || null,
        stock: item.stockQuantity,
      })
    }
    setAdding(false)
    toast({
      title: 'Added to cart',
      description: `${selectedItems.length + 1} item(s) · ${formatBDT(total)}`,
    })
    openCart()
  }

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">Frequently Bought Together</h2>
        <div className="flex items-center gap-2 py-8 text-sm text-ink-400">
          <Loader2 size={16} className="animate-spin" /> Loading recommendations...
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-ink-900">Frequently Bought Together</h2>
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* product chain visual */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-1">
            {/* main product */}
            <Link href={`#/product/${mainProduct.slug}`} className="group">
              <div className="h-24 w-24 overflow-hidden rounded-lg border-2 border-brand-500 bg-ink-50">
                {mainProduct.images?.[0]?.url ? (
                   
                  <img src={mainProduct.images[0].url} alt={mainProduct.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <p className="mt-1 line-clamp-1 max-w-[100px] text-[11px] font-medium text-ink-700 group-hover:text-brand-600">
                {mainProduct.title}
              </p>
              <p className="text-xs font-bold text-brand-600">{formatBDT(mainProduct.price)}</p>
            </Link>

            {/* recommended items */}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Plus size={16} className="text-ink-300" />
                <label className="group cursor-pointer">
                  <div className={`relative h-24 w-24 overflow-hidden rounded-lg border-2 bg-ink-50 transition ${
                    selected.has(item.id) ? 'border-brand-500' : 'border-ink-100 opacity-60 hover:opacity-100'
                  }`}>
                    {item.images?.[0]?.url ? (
                       
                      <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover" />
                    ) : null}
                    {selected.has(item.id) && (
                      <div className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
                        <Check size={11} />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 max-w-[100px] text-[11px] font-medium text-ink-700 group-hover:text-brand-600">
                    {item.title}
                  </p>
                  <p className="text-xs font-bold text-brand-600">{formatBDT(item.price)}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                      className="h-3 w-3"
                    />
                    <span className="text-[10px] text-ink-500">Add</span>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* total + add to cart */}
          <div className="flex flex-row items-center justify-between gap-3 rounded-xl bg-ink-50 p-4 lg:w-64 lg:flex-col lg:items-stretch">
            <div>
              <p className="text-xs text-ink-500">Total for {selectedItems.length + 1} item(s)</p>
              <p className="text-xl font-bold text-brand-600">{formatBDT(total)}</p>
            </div>
            <Button
              onClick={addAllToCart}
              disabled={adding || selectedItems.length === 0}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {adding ? <Loader2 size={14} className="mr-1 animate-spin" /> : <ShoppingCart size={14} className="mr-1" />}
              Add All to Cart
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
