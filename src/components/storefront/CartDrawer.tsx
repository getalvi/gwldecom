'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, X, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { navigate } from '@/lib/router'
import { formatBDT } from '@/lib/api'
import { useEffect } from 'react'

export function CartDrawer() {
  const { items, removeItem, updateQty, total, count } = useCart()
  const open = useUi((s) => s.cartDrawerOpen)
  const close = useUi((s) => s.closeCartDrawer)
  const subtotal = total()
  const shipping = subtotal > 5000 || subtotal === 0 ? 0 : 60
  const freeShipRemaining = Math.max(0, 5000 - subtotal)
  const freeShipPct = Math.min(100, (subtotal / 5000) * 100)

  // Lock body scroll while open (Sheet already handles, but ensure)
  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-md">
        {/* header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-brand-600" />
            <h2 className="text-base font-bold text-ink-900">Your Cart</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {count()}
            </span>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close">
              <X size={18} />
            </Button>
          </SheetClose>
        </div>

        {items.length === 0 ? (
          // empty state
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-ink-50">
              <ShoppingBag size={36} className="text-ink-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">Your cart is empty</p>
              <p className="mt-1 text-xs text-ink-400">Add products to start your order.</p>
            </div>
            <SheetClose asChild>
              <Button className="mt-2 bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/')}>
                Start Shopping <ArrowRight size={14} className="ml-1" />
              </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            {/* free shipping progress */}
            <div className="border-b border-ink-100 bg-brand-50/50 px-5 py-3">
              {freeShipRemaining > 0 ? (
                <p className="text-xs text-ink-600">
                  Add <span className="font-bold text-brand-700">{formatBDT(freeShipRemaining)}</span> more for{' '}
                  <span className="font-semibold text-emerald-600">FREE shipping</span>
                </p>
              ) : (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <ShoppingBag size={14} /> You’ve unlocked FREE shipping!
                </p>
              )}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                  style={{ width: `${freeShipPct}%` }}
                />
              </div>
            </div>

            {/* items */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scroll-thin">
              {items.map((item) => {
                const vk = item.variant ? JSON.stringify(item.variant) : ''
                return (
                  <div key={item.productId + vk} className="flex gap-3">
                    <Link
                      href={`#/product/${item.slug}`}
                      onClick={close}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
                    >
                      {item.image ? (
                         
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={`#/product/${item.slug}`}
                        onClick={close}
                        className="line-clamp-2 text-xs font-medium leading-snug text-ink-800 hover:text-brand-600"
                      >
                        {item.title}
                      </Link>
                      {item.variant ? (
                        <p className="mt-0.5 text-[10px] text-ink-400">
                          {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between pt-1.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(item.productId, item.quantity - 1, vk)}
                          >
                            <Minus size={10} />
                          </Button>
                          <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(item.productId, item.quantity + 1, vk)}
                          >
                            <Plus size={10} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-brand-600">
                            {formatBDT(item.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId, vk)}
                            className="text-ink-300 transition hover:text-red-500"
                            aria-label="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* footer */}
            <div className="border-t border-ink-100 bg-white px-5 py-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink-900">{formatBDT(subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Shipping</span>
                  <span className="font-medium text-ink-900">
                    {shipping === 0 ? <span className="text-emerald-600">FREE</span> : formatBDT(shipping)}
                  </span>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-brand-600">{formatBDT(subtotal + shipping)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <SheetClose asChild>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/cart')}
                  >
                    View Cart
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    className="flex-1 bg-brand-500 hover:bg-brand-600"
                    onClick={() => navigate('/checkout')}
                  >
                    Checkout <ArrowRight size={14} className="ml-1" />
                  </Button>
                </SheetClose>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
