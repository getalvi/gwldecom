"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/lib/cart-store"
import { formatBDT } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ShoppingBag, Tag, Check, Truck, ShieldCheck, MapPin, CreditCard } from "lucide-react"
import { toast } from "sonner"

const PAYMENTS = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay when you receive", icon: CreditCard },
  { id: "bkash", label: "bKash", desc: "Mobile financial service", icon: CreditCard },
  { id: "nagad", label: "Nagad", desc: "Mobile financial service", icon: CreditCard },
  { id: "sslcommerz", label: "Card (SSLCommerz)", desc: "Visa / Mastercard", icon: CreditCard },
]

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCart((s) => s.items)
  const subtotal = useCart((s) => s.subtotal())
  const clear = useCart((s) => s.clear)
  const [form, setForm] = useState({ fullName: "", phone: "", addressLine1: "", city: "", district: "", postalCode: "" })
  const [payment, setPayment] = useState("cod")
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState<{ valid: boolean; discount: number; message: string } | null>(null)
  const [loadingCoupon, setLoadingCoupon] = useState(false)
  const [placing, setPlacing] = useState(false)
  const shipping = subtotal >= 2000 ? 0 : 60
  const discount = coupon?.valid ? coupon.discount : 0
  const total = Math.max(0, subtotal + shipping - discount)

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setLoadingCoupon(true)
    try {
      const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponCode, subtotal }) })
      const data = await res.json()
      setCoupon({ valid: data.valid, discount: data.discount || 0, message: data.message })
      if (data.valid) toast.success(data.message); else toast.error(data.message)
    } catch { toast.error("Failed") }
    setLoadingCoupon(false)
  }

  async function placeOrder() {
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.city || !form.district) { toast.error("Please fill all shipping fields"); return }
    setPlacing(true)
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, paymentMethod: payment, couponCode: coupon?.valid ? couponCode : null, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Order failed"); setPlacing(false); return }
      clear(); toast.success("Order placed!"); router.push(`/account/orders?success=${data.orderId}`)
    } catch { toast.error("Network error") }
    setPlacing(false)
  }

  if (items.length === 0) {
    return <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center"><ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" /><h1 className="text-xl font-bold">Your cart is empty</h1><p className="mt-1 text-sm text-muted-foreground">Add some products before checking out.</p><Button asChild className="mt-4"><Link href="/category/all">Browse Products</Link></Button></div>
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5 text-primary" /> Shipping Address</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+8801XXXXXXXXX" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Address Line</Label><Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>District</Label><Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Dhaka","Chattogram","Khulna","Rajshahi","Sylhet","Barishal","Rangpur","Mymensingh"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-primary" /> Payment Method</CardTitle></CardHeader>
            <CardContent><RadioGroup value={payment} onValueChange={setPayment} className="grid gap-2 sm:grid-cols-2">{PAYMENTS.map((p) => <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${payment === p.id ? "border-primary bg-primary/5" : "hover:border-foreground/20"}`}><RadioGroupItem value={p.id} className="mt-1" /><div className="flex-1"><div className="flex items-center gap-2"><p.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{p.label}</span></div><p className="text-xs text-muted-foreground">{p.desc}</p></div></label>)}</RadioGroup></CardContent>
          </Card>
        </div>
        <div>
          <Card className="sticky top-44">
            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-64 space-y-3 overflow-y-auto scroll-thin pr-1">{items.map((it) => <div key={it.id} className="flex gap-3">{it.image && <img src={it.image} alt={it.title} className="h-14 w-14 shrink-0 rounded-md object-cover" />}<div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-medium">{it.title}</p><p className="text-xs text-muted-foreground">Qty: {it.quantity}</p></div><span className="text-sm font-semibold">{formatBDT(it.price * it.quantity)}</span></div>)}</div>
              <Separator />
              <div className="space-y-2"><Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground"><Tag className="mr-1 inline h-3 w-3" />Coupon Code</Label><div className="flex gap-2"><Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SAVE10" className="uppercase" /><Button variant="outline" size="sm" onClick={applyCoupon} disabled={loadingCoupon || !couponCode}>{loadingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</Button></div>{coupon && <p className={`flex items-center gap-1 text-xs ${coupon.valid ? "text-emerald-600" : "text-destructive"}`}>{coupon.valid && <Check className="h-3 w-3" />}{coupon.message}</p>}<p className="text-xs text-muted-foreground">Try: SAVE10, FLAT200, MEGA500</p></div>
              <Separator />
              <div className="space-y-1.5 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(subtotal)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? <span className="text-emerald-600">Free</span> : formatBDT(shipping)}</span></div>{discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatBDT(discount)}</span></div>}<Separator /><div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatBDT(total)}</span></div></div>
              <Button onClick={placeOrder} className="w-full" size="lg" disabled={placing}>{placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Place Order</Button>
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure</span><span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-primary" /> Fast Delivery</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
