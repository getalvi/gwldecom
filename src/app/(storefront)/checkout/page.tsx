"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, CreditCard, Banknote, Smartphone, ChevronRight, Tag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "sslcommerz";

const DELIVERY_FEE = 60;
const DELIVERY_THRESHOLD = 999;

const PAYMENT_OPTIONS = [
  { id: "cod" as const, label: "Cash on Delivery", icon: Banknote, desc: "Pay when you receive" },
  { id: "bkash" as const, label: "bKash", icon: Smartphone, desc: "Mobile banking" },
  { id: "nagad" as const, label: "Nagad", icon: Smartphone, desc: "Mobile banking" },
  { id: "rocket" as const, label: "Rocket", icon: Smartphone, desc: "Mobile banking" },
  { id: "sslcommerz" as const, label: "Card / SSL", icon: CreditCard, desc: "Visa, Mastercard, etc." },
];

export default function CheckoutPage() {
  const { items, subtotal, clear, isEmpty } = useCart();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "", phone: "", addressLine1: "", city: "", district: "", postalCode: "",
  });

  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery - discount;
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const res = await fetch(`/api/coupons/validate?code=${coupon.toUpperCase()}&total=${subtotal}`);
    const data = await res.json();
    if (res.ok && data.discount) {
      setDiscount(data.discount);
      setCouponApplied(true);
    } else {
      setError(data.error ?? "Invalid coupon");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: form,
        paymentMethod,
        couponCode: couponApplied ? coupon : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Checkout failed"); return; }
    clear();
    router.push(`/orders/${data.orderId}/confirmation`);
  }

  if (isEmpty) {
    return <main className="container py-20 text-center text-muted-foreground">Your cart is empty.</main>;
  }

  return (
    <main className="container py-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left col */}
          <div className="lg:col-span-2 space-y-5">
            {/* Shipping */}
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold mb-4">
                <MapPin size={18} className="text-primary" /> Shipping Address
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Full Name" value={form.fullName} onChange={e => set("fullName", e.target.value)} required />
                <Input label="Phone Number" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} required />
                <div className="sm:col-span-2">
                  <Input label="Address" value={form.addressLine1} onChange={e => set("addressLine1", e.target.value)} required />
                </div>
                <Input label="City" value={form.city} onChange={e => set("city", e.target.value)} required />
                <Input label="District" value={form.district} onChange={e => set("district", e.target.value)} required />
                <Input label="Postal Code (optional)" value={form.postalCode} onChange={e => set("postalCode", e.target.value)} />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold mb-4">
                <CreditCard size={18} className="text-primary" /> Payment Method
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map(({ id, label, icon: Icon, desc }) => (
                  <button key={id} type="button" onClick={() => setPaymentMethod(id)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${paymentMethod === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className={`rounded-md p-1.5 ${paymentMethod === id ? "bg-primary text-white" : "bg-secondary"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {paymentMethod !== "cod" && (
                <p className="mt-3 text-xs text-muted-foreground bg-secondary rounded-md p-3">
                  {paymentMethod === "sslcommerz"
                    ? "You will be redirected to SSLCommerz secure payment gateway after placing the order."
                    : `You will receive a ${paymentMethod} payment prompt after order confirmation.`}
                </p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-background p-5 sticky top-20 space-y-4">
              <h2 className="font-semibold text-lg">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-2 items-center">
                    <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-secondary">
                      {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="48px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatBDT(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  icon={<Tag size={14} />}
                  disabled={couponApplied}
                  className="text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={couponApplied} className="shrink-0">
                  {couponApplied ? "Applied!" : "Apply"}
                </Button>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm border-t border-border pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-success"><span>Coupon discount</span><span>-{formatBDT(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className={delivery === 0 ? "text-success" : ""}>{delivery === 0 ? "FREE" : formatBDT(delivery)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2"><span>Total</span><span className="text-primary">{formatBDT(total)}</span></div>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>}

              <Button type="submit" className="w-full" size="lg" loading={submitting}>
                {submitting ? "Placing order..." : "Place Order"} <ChevronRight size={16} />
              </Button>
              <p className="text-xs text-center text-muted-foreground">By placing order you agree to our terms of service</p>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
