'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, Package, Heart, MapPin, LogOut, ChevronRight, Plus, Trash2, Star, ShoppingCart, RefreshCw, Download, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/lib/session-store'
import { useCart } from '@/lib/cart'
import { useUi } from '@/lib/ui-store'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import { ProductCard } from '@/components/storefront/ProductCard'
import { StarRating } from '@/components/storefront/StarRating'
import type { OrderT, AddressT } from '@/lib/types'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
]

export function AccountView({ tab = 'profile' }: { tab?: string }) {
  const { user, logout } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user])

  if (!user) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside>
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-3 border-b border-ink-100 pb-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-white">
                <span className="text-lg font-bold">{user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{user.fullName || 'User'}</p>
                <p className="truncate text-xs text-ink-400">{user.email}</p>
              </div>
            </div>
            <nav className="space-y-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/account/${t.id === 'profile' ? '' : t.id}`)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    tab === t.id || (tab === 'profile' && t.id === 'profile')
                      ? 'bg-brand-50 font-medium text-brand-700'
                      : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
              {(user.role === 'admin' || user.role === 'staff') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                >
                  <ChevronRight size={16} /> Admin Dashboard
                </button>
              )}
              <button
                onClick={async () => { await logout(); navigate('/'); toast({ title: 'Logged out' }) }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Logout
              </button>
            </nav>
          </Card>
        </aside>

        {/* Content */}
        <div>
          {tab === 'profile' ? <ProfileTab /> : null}
          {tab === 'orders' ? <OrdersTab /> : null}
          {tab === 'wishlist' ? <WishlistTab /> : null}
          {tab === 'addresses' ? <AddressesTab /> : null}
        </div>
      </div>
    </div>
  )
}

function ProfileTab() {
  const { user } = useSession()
  if (!user) return null
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-bold text-ink-900">Profile Information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Full Name</Label>
          <Input value={user.fullName || ''} readOnly className="mt-1 bg-ink-50" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={user.email} readOnly className="mt-1 bg-ink-50" />
        </div>
        <div>
          <Label className="text-xs">Role</Label>
          <div className="mt-1">
            <Badge className="capitalize bg-brand-50 text-brand-700">{user.role}</Badge>
          </div>
        </div>
      </div>
      <Separator className="my-6" />
      <p className="text-xs text-ink-400">
        Profile editing is disabled in this demo. Use the admin panel to manage user roles.
      </p>
    </Card>
  )
}

function OrdersTab() {
  const [orders, setOrders] = useState<OrderT[]>([])
  const [loading, setLoading] = useState(true)
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()
  useEffect(() => {
    api<OrderT[]>('/api/orders').then(setOrders).finally(() => setLoading(false))
  }, [])
  async function reorder(orderId: string) {
    setReorderingId(orderId)
    try {
      const res = await api<{ items: any[]; skipped: number; count: number }>(
        `/api/orders/${orderId}/reorder`
      )
      if (!res.items.length) {
        toast({
          title: 'Cannot re-order',
          description: 'Items from this order are no longer available.',
          variant: 'destructive',
        })
        return
      }
      for (const item of res.items) addToCart(item)
      toast({
        title: `${res.count} item(s) added to cart`,
        description:
          res.skipped > 0
            ? `${res.skipped} unavailable item(s) skipped.`
            : 'Ready to checkout again.',
      })
      openCart()
    } catch (e: any) {
      toast({ title: e.message || 'Re-order failed', variant: 'destructive' })
    } finally {
      setReorderingId(null)
    }
  }
  if (loading) return <div className="text-sm text-ink-400">Loading orders...</div>
  if (orders.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Package size={40} className="mx-auto mb-3 text-ink-200" />
        <p className="text-sm text-ink-400">You have no orders yet.</p>
        <Button variant="link" onClick={() => navigate('/')}>Start shopping</Button>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">#{o.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="capitalize bg-ink-50 text-ink-600">{o.status}</Badge>
              <Badge className={
                o.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700'
                : o.paymentStatus === 'refunded' ? 'bg-amber-50 text-amber-700'
                : 'bg-ink-50 text-ink-600'
              }>{o.paymentStatus}</Badge>
            </div>
          </div>
          <Separator className="my-3" />
          {o.items && o.items.length ? (
            <div className="space-y-1.5">
              {o.items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <Link href={`#/product/${it.product?.slug || ''}`} className="line-clamp-1 text-ink-700 hover:text-brand-600">
                    {it.product?.title || 'Product'} ×{it.quantity}
                  </Link>
                  <span className="text-ink-900">{formatBDT(it.unitPrice * it.quantity)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400 uppercase">{o.paymentMethod}</span>
              <Link
                href={`#/order/${o.id}`}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Track order →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-600">{formatBDT(o.total)}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs text-ink-500"
                onClick={() => window.open(`/api/orders/${o.id}/invoice`, '_blank')}
                title="Download invoice"
              >
                <Download size={12} />
                Invoice
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs"
                disabled={reorderingId === o.id}
                onClick={() => reorder(o.id)}
              >
                <RefreshCw size={12} className={reorderingId === o.id ? 'animate-spin' : ''} />
                {reorderingId === o.id ? 'Adding...' : 'Re-order'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function WishlistTab() {
  const [items, setItems] = useState<any[]>([])
  const [priceDrops, setPriceDrops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const addToCart = useCart((s) => s.addItem)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()
  useEffect(() => {
    Promise.all([
      api<any[]>('/api/wishlist'),
      api<{ items: any[] }>('/api/wishlist/price-drops').catch(() => ({ items: [] })),
    ])
      .then(([w, drops]) => {
        setItems(w)
        setPriceDrops(drops.items)
      })
      .finally(() => setLoading(false))
  }, [])
  async function remove(productId: string) {
    await api(`/api/wishlist/${productId}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.productId !== productId))
    toast({ title: 'Removed from wishlist' })
  }
  function addAllToCart() {
    if (!items.length) return
    setAdding(true)
    for (const i of items) {
      const p = i.product
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
    setAdding(false)
    toast({ title: 'Added all to cart', description: `${items.length} item(s)` })
    openCart()
  }
  if (loading) return <div className="text-sm text-ink-400">Loading wishlist...</div>
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Heart size={40} className="mx-auto mb-3 text-ink-200" />
        <p className="text-sm text-ink-400">Your wishlist is empty.</p>
        <Button variant="link" onClick={() => navigate('/')}>Browse products</Button>
      </Card>
    )
  }
  return (
    <div>
      {/* Price drop alerts */}
      {priceDrops.length > 0 ? (
        <Card className="mb-4 border-brand-200 bg-brand-50/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
            <TrendingDown size={15} /> Price Drop Alerts ({priceDrops.length})
          </h3>
          <p className="mb-3 text-xs text-ink-500">
            {priceDrops.length} item(s) in your wishlist are now on sale!
          </p>
          <div className="flex gap-3 overflow-x-auto scroll-thin pb-1">
            {priceDrops.map((p) => (
              <Link
                key={p.id}
                href={`#/product/${p.slug}`}
                className="group flex w-40 shrink-0 flex-col gap-1.5 rounded-lg border border-ink-100 bg-white p-2 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="relative aspect-square overflow-hidden rounded bg-ink-50">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />
                  ) : null}
                  <Badge className="absolute right-1 top-1 bg-brand-500 text-white text-[10px]">
                    -{p.discountPct}%
                  </Badge>
                </div>
                <p className="line-clamp-2 text-[11px] font-medium text-ink-700 group-hover:text-brand-600">
                  {p.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-brand-600">{formatBDT(p.price)}</span>
                  <span className="text-[10px] text-ink-400 line-through">{formatBDT(p.compareAtPrice)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Your Wishlist ({items.length})</h2>
        <Button size="sm" onClick={addAllToCart} disabled={adding} className="bg-brand-500 hover:bg-brand-600">
          <ShoppingCart size={14} className="mr-1" /> {adding ? 'Adding...' : 'Add All to Cart'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((i) => (
          <div key={i.id} className="relative">
            <ProductCard product={i.product} />
            <button
              onClick={() => remove(i.productId)}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-500 shadow hover:bg-white"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddressesTab() {
  const [addresses, setAddresses] = useState<AddressT[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', addressLine1: '', city: '', district: '', postalCode: '', label: '', isDefault: false })
  const { toast } = useToast()

  useEffect(() => {
    api<AddressT[]>('/api/addresses').then(setAddresses).finally(() => setLoading(false))
  }, [])

  async function addAddress(e: React.FormEvent) {
    e.preventDefault()
    try {
      const a = await api<AddressT>('/api/addresses', { method: 'POST', body: JSON.stringify(form) })
      setAddresses((prev) => [a, ...prev.filter((x) => x.id !== a.id)])
      setShowForm(false)
      setForm({ fullName: '', phone: '', addressLine1: '', city: '', district: '', postalCode: '', label: '', isDefault: false })
      toast({ title: 'Address added' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  async function removeAddr(id: string) {
    await api(`/api/addresses/${id}`, { method: 'DELETE' })
    setAddresses((prev) => prev.filter((x) => x.id !== id))
    toast({ title: 'Address removed' })
  }

  if (loading) return <div className="text-sm text-ink-400">Loading...</div>

  return (
    <div>
      <div className="mb-3 flex justify-between">
        <h2 className="text-lg font-bold text-ink-900">Saved Addresses</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="bg-brand-500 hover:bg-brand-600">
          <Plus size={14} className="mr-1" /> Add New
        </Button>
      </div>

      {showForm ? (
        <Card className="mb-4 p-4">
          <form onSubmit={addAddress} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Office" />
            </div>
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <Label className="text-xs">Postal Code</Label>
              <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Address Line</Label>
              <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div>
              <Label className="text-xs">District</Label>
              <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="default" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              <Label htmlFor="default" className="text-xs">Set as default</Label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" size="sm" className="bg-brand-500 hover:bg-brand-600">Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {addresses.length === 0 ? (
        <Card className="p-10 text-center">
          <MapPin size={40} className="mx-auto mb-3 text-ink-200" />
          <p className="text-sm text-ink-400">No saved addresses yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="relative p-4">
              <div className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5 text-brand-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900">{a.fullName}</p>
                    {a.isDefault ? <Badge className="bg-brand-50 text-brand-700 text-[10px]">Default</Badge> : null}
                    {a.label ? <Badge variant="outline" className="text-[10px]">{a.label}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-600">{a.addressLine1}</p>
                  <p className="text-sm text-ink-600">{a.city}, {a.district} {a.postalCode}</p>
                  <p className="mt-1 text-sm text-ink-500">📞 {a.phone}</p>
                </div>
                <button onClick={() => removeAddr(a.id)} className="text-ink-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
