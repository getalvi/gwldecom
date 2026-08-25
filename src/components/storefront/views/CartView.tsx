'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X, Bookmark, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart'
import { navigate } from '@/lib/router'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function CartView() {
  const { items, savedItems, removeItem, updateQty, clear, total, saveForLater, moveToCart, removeSaved } = useCart()
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const { toast } = useToast()

  const subtotal = total()
  const discount = appliedCoupon?.discount || 0
  const shipping = subtotal > 5000 || subtotal === 0 ? 0 : 60
  const grandTotal = Math.max(0, subtotal - discount) + shipping

  async function applyCoupon() {
    if (!coupon.trim()) return
    try {
      const r = await api<{ valid: boolean; discount: number; error?: string }>(
        `/api/coupons?code=${encodeURIComponent(coupon.toUpperCase())}&total=${subtotal}`
      )
      if (r.valid) {
        setAppliedCoupon({ code: coupon.toUpperCase(), discount: r.discount })
        toast({ title: 'Coupon applied!', description: `You saved ${formatBDT(r.discount)}` })
      } else {
        toast({ title: r.error || 'Invalid coupon', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to validate coupon', variant: 'destructive' })
    }
  }

  function checkout() {
    // stash coupon in sessionStorage for checkout view
    if (appliedCoupon) {
      sessionStorage.setItem('pendingCoupon', appliedCoupon.code)
    } else {
      sessionStorage.removeItem('pendingCoupon')
    }
    navigate('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-ink-50">
          <ShoppingBag size={36} className="text-ink-300" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">Your cart is empty</h1>
        <p className="mt-1 text-sm text-ink-400">Add some products to get started.</p>
        <Button className="mt-6 bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-ink-900 sm:text-2xl">Shopping Cart ({items.length})</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="space-y-3">
            {items.map((item) => {
              const vk = item.variant ? JSON.stringify(item.variant) : ''
              return (
                <div
                  key={item.productId + vk}
                  className="flex gap-3 rounded-xl border border-ink-100 bg-white p-3"
                >
                  <Link
                    href={`#/product/${item.slug}`}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-50"
                  >
                    {item.image ? (
                       
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`#/product/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium text-ink-800 hover:text-brand-600"
                    >
                      {item.title}
                    </Link>
                    {item.variant ? (
                      <p className="mt-0.5 text-xs text-ink-400">
                        {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.productId, item.quantity - 1, vk)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.productId, item.quantity + 1, vk)}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-brand-600">
                          {formatBDT(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => { saveForLater(item.productId, vk); toast({ title: 'Saved for later', description: item.title }) }}
                          className="text-ink-400 hover:text-brand-500"
                          aria-label="Save for later"
                          title="Save for later"
                        >
                          <Bookmark size={15} />
                        </button>
                        <button
                          onClick={() => removeItem(item.productId, vk)}
                          className="text-ink-400 hover:text-red-500"
                          aria-label="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-ink-500">
              ← Continue Shopping
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="text-red-500 hover:text-red-600">
              Clear Cart
            </Button>
          </div>

          {/* Saved for later section */}
          {savedItems.length > 0 ? (
            <div className="mt-6 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Bookmark size={15} className="text-brand-500" />
                Saved for Later ({savedItems.length})
              </h3>
              <div className="space-y-3">
                {savedItems.map((item) => {
                  const vk = item.variant ? JSON.stringify(item.variant) : ''
                  return (
                    <div key={item.productId + vk} className="flex gap-3 rounded-lg bg-white p-3">
                      <Link
                        href={`#/product/${item.slug}`}
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
                      >
                        {item.image ? (
                           
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`#/product/${item.slug}`}
                          className="line-clamp-2 text-sm font-medium text-ink-800 hover:text-brand-600"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-0.5 text-sm font-bold text-brand-600">{formatBDT(item.price)}</p>
                        <div className="mt-auto flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => { moveToCart(item.productId, vk); toast({ title: 'Moved to cart', description: item.title }) }}
                          >
                            <RotateCcw size={12} /> Move to Cart
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-ink-400 hover:text-red-500"
                            onClick={() => removeSaved(item.productId, vk)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-32 rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink-900">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Tag size={14} /> {appliedCoupon.code}
                  </span>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Coupon code"
                    className="h-9 text-sm uppercase"
                  />
                  <Button variant="outline" size="sm" onClick={applyCoupon} className="shrink-0">
                    Apply
                  </Button>
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-ink-400">Try: WELCOME10 or FLAT200</p>
            </div>

            <Separator className="my-3" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal</span>
                <span className="font-medium text-ink-900">{formatBDT(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatBDT(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-600">
                <span>Shipping</span>
                <span className="font-medium text-ink-900">
                  {shipping === 0 ? 'FREE' : formatBDT(shipping)}
                </span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-brand-600">{formatBDT(grandTotal)}</span>
            </div>
            <Button
              onClick={checkout}
              size="lg"
              className="mt-4 w-full bg-brand-500 hover:bg-brand-600"
            >
              Proceed to Checkout <ArrowRight size={16} className="ml-1" />
            </Button>
            <p className="mt-2 text-center text-[11px] text-ink-400">
              Free shipping on orders over ৳5000
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
