"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    district: "",
    postalCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: form,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Checkout failed");
      return;
    }

    clear();
    router.push(`/orders/${data.orderId}/confirmation`);
  }

  if (items.length === 0) {
    return <main className="container py-16 text-center text-muted-foreground">Your cart is empty.</main>;
  }

  return (
    <main className="container max-w-lg py-6">
      <h1 className="mb-6 text-xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Full name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        <Input placeholder="Phone number" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
        <Input
          placeholder="Address"
          value={form.addressLine1}
          onChange={(e) => set("addressLine1", e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} required />
          <Input placeholder="District" value={form.district} onChange={(e) => set("district", e.target.value)} required />
        </div>
        <Input
          placeholder="Postal code (optional)"
          value={form.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
        />

        <div className="border-t border-border pt-4 text-sm">
          <p className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatBDT(subtotal)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Cash on Delivery — payment gateways not yet configured.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Placing order..." : "Place Order"}
        </Button>
      </form>
    </main>
  );
}
