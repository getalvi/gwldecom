'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, CreditCard, Wallet, Banknote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart'
import { useSession } from '@/lib/session-store'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { AddressT, PaymentMethod } from '@/lib/types'

const PAYMENTS: { id: PaymentMethod; label: string; icon: any; sub: string }[] = [
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote, sub: 'Pay when you receive' },
  { id: 'bkash', label: 'bKash', icon: Wallet, sub: 'Mobile banking' },
  { id: 'nagad', label: 'Nagad', icon: Wallet, sub: 'Mobile banking' },
  { id: 'rocket', label: 'Rocket', icon: Wallet, sub: 'Mobile banking' },
  { id: 'sslcommerz', label: 'Card (SSLCommerz)', icon: CreditCard, sub: 'VISA / Mastercard' },
]

export function CheckoutView() {
  const { items, total, clear } = useCart()
  const { user } = useSession()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<AddressT[]>([])
  const [selectedAddr, setSelectedAddr] = useState<string>('new')
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: '',
    addressLine1: '',
    city: '',
    district: '',
    postalCode: '',
  })
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  const [couponCode, setCouponCode] = useState('')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (user) {
      api<AddressT[]>('/api/addresses').then((a) => {
        setAddresses(a)
        if (a.length > 0 && a.find((x) => x.isDefault)) {
          setSelectedAddr(a.find((x) => x.isDefault)!.id)
        } else if (a.length > 0) {
          setSelectedAddr(a[0].id)
        }
      })
    }
    setCouponCode(sessionStorage.getItem('pendingCoupon') || '')
  }, [user])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Your cart is empty</h1>
        <Button className="mt-4 bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Please login to checkout</h1>
        <p className="mt-1 text-sm text-ink-400">You need an account to place an order.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button variant="outline" onClick={() => navigate('/register')}>Register</Button>
        </div>
      </div>
    )
  }

  const subtotal = total()
  const discount = couponCode ? Math.round(subtotal * 0.1) : 0 // simplified: coupon validated at order time
  const shipping = subtotal - discount > 5000 ? 0 : 60
  const grandTotal = Math.max(0, subtotal - discount) + shipping

  function buildShippingAddress(): Record<string, unknown> {
    if (selectedAddr !== 'new') {
      const a = addresses.find((x) => x.id === selectedAddr)
      if (a) {
        return {
          fullName: a.fullName,
          phone: a.phone,
          addressLine1: a.addressLine1,
          city: a.city,
          district: a.district,
          postalCode: a.postalCode,
          label: a.label,
        }
      }
    }
    return { ...form }
  }

  async function placeOrder() {
    const addr = buildShippingAddress()
    if (!addr.fullName || !addr.phone || !addr.addressLine1) {
      toast({ title: 'Please complete shipping address', variant: 'destructive' })
      return
    }
    setPlacing(true)
    try {
      const order = await api<{ id: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items,
          shippingAddress: addr,
          paymentMethod: payment,
          couponCode: couponCode || null,
        }),
      })
      clear()
      sessionStorage.removeItem('pendingCoupon')
      toast({ title: 'Order placed successfully!' })
      navigate(`/order/${order.id}`)
    } catch (e: any) {
      toast({ title: e.message || 'Failed to place order', variant: 'destructive' })
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-ink-900 sm:text-2xl">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Address */}
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs text-white">1</span>
              Shipping Address
            </h2>
            {addresses.length > 0 ? (
              <RadioGroup value={selectedAddr} onValueChange={setSelectedAddr} className="mb-4 space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      selectedAddr === a.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-300'
                    }`}
                  >
                    <RadioGroupItem value={a.id} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium text-ink-900">
                        {a.fullName} {a.isDefault ? <span className="text-xs text-brand-600">(Default)</span> : null}
                      </p>
                      <p className="text-ink-500">{a.addressLine1}, {a.city}, {a.district} {a.postalCode}</p>
                      <p className="text-ink-500">{a.phone}</p>
                    </div>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    selectedAddr === 'new' ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-300'
                  }`}
                >
                  <RadioGroupItem value="new" className="mt-1" />
                  <div className="text-sm font-medium text-ink-900">+ Use a new address</div>
                </label>
              </RadioGroup>
            ) : null}
            {selectedAddr === 'new' || addresses.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address Line</Label>
                  <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="House, road, area" />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">District</Label>
                  <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
              </div>
            ) : null}
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs text-white">2</span>
              Payment Method
            </h2>
            <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="grid gap-2 sm:grid-cols-2">
              {PAYMENTS.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    payment === p.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-300'
                  }`}
                >
                  <RadioGroupItem value={p.id} />
                  <p.icon size={20} className="text-brand-600" />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{p.label}</p>
                    <p className="text-xs text-ink-400">{p.sub}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-32 rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Order Summary</h2>
            <div className="max-h-48 space-y-2 overflow-y-auto scroll-thin">
              {items.map((item) => (
                <div key={item.productId + JSON.stringify(item.variant || {})} className="flex gap-2 text-xs">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-ink-50">
                    {item.image ? (
                       
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-ink-800">{item.title}</p>
                    <p className="text-ink-400">×{item.quantity}</p>
                  </div>
                  <span className="font-medium text-ink-900">{formatBDT(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal</span>
                <span className="font-medium text-ink-900">{formatBDT(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
                  <span>-{formatBDT(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-600">
                <span>Shipping</span>
                <span className="font-medium text-ink-900">{shipping === 0 ? 'FREE' : formatBDT(shipping)}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-brand-600">{formatBDT(grandTotal)}</span>
            </div>
            <Button
              onClick={placeOrder}
              disabled={placing}
              size="lg"
              className="mt-4 w-full bg-brand-500 hover:bg-brand-600"
            >
              {placing ? <Loader2 size={16} className="mr-1 animate-spin" /> : <CheckCircle2 size={16} className="mr-1" />}
              {placing ? 'Placing Order...' : 'Place Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
