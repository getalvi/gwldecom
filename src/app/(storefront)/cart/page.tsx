"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag, ChevronRight, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

const DELIVERY_THRESHOLD = 999;
const DELIVERY_FEE = 60;

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, isEmpty } = useCart();
  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  if (isEmpty) {
    return (
      <main className="container py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/"><Button size="lg">Continue Shopping</Button></Link>
      </main>
    );
  }

  return (
    <main className="container py-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({items.reduce((s, i) => s + i.quantity, 0)} items)</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 rounded-xl border border-border bg-background p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="80px" />}
              </div>
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${item.slug}`} className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
                    {item.title}
                  </Link>
                  <button onClick={() => removeItem(item.productId)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-primary">{formatBDT(item.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-background p-5 sticky top-20 space-y-4">
            <h2 className="text-lg font-bold">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className={delivery === 0 ? "text-success font-medium" : ""}>
                  {delivery === 0 ? "FREE" : formatBDT(delivery)}
                </span>
              </div>
              {delivery > 0 && (
                <p className="text-xs text-muted-foreground bg-secondary rounded-md p-2">
                  Add {formatBDT(DELIVERY_THRESHOLD - subtotal)} more for free delivery
                </p>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatBDT(total)}</span>
              </div>
            </div>
            <Link href="/checkout">
              <Button className="w-full" size="lg">
                Proceed to Checkout <ChevronRight size={16} />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
