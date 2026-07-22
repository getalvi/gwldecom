"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <main className="container py-16 text-center">
        <p className="mb-4 text-muted-foreground">Your cart is empty.</p>
        <Link href="/">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-6">
      <h1 className="mb-6 text-xl font-bold">Your Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 border-b border-border pb-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-secondary">
              {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{formatBDT(item.price)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
              className="w-16 rounded-md border border-border p-1 text-center text-sm"
            />
            <button
              onClick={() => removeItem(item.productId)}
              className="text-xs text-destructive underline"
              aria-label={`Remove ${item.title}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-lg font-semibold">Subtotal: {formatBDT(subtotal)}</span>
        <Link href="/checkout">
          <Button>Proceed to Checkout</Button>
        </Link>
      </div>
    </main>
  );
}
