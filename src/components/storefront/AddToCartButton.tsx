"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

interface Props {
  productId: string;
  title: string;
  price: number;
  imageUrl: string | null;
  slug: string;
  inStock?: boolean;
}

export function AddToCartButton({ productId, title, price, imageUrl, slug, inStock = true }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  if (!inStock) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quantity:</span>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 hover:bg-secondary transition-colors flex items-center justify-center">-</button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 hover:bg-secondary transition-colors flex items-center justify-center">+</button>
          </div>
        </div>
        <Button className="w-full" disabled size="lg">Out of Stock</Button>
      </div>
    );
  }

  function handleAdd() {
    addItem({ productId, title, price, imageUrl, slug }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    addItem({ productId, title, price, imageUrl, slug }, qty);
    router.push("/checkout");
  }

  return (
    <div className="space-y-3">
      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Quantity:</span>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 hover:bg-secondary transition-colors flex items-center justify-center font-medium">-</button>
          <span className="w-10 text-center text-sm font-semibold">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-9 h-9 hover:bg-secondary transition-colors flex items-center justify-center font-medium">+</button>
        </div>
      </div>
      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleAdd} variant="outline" size="lg" className="flex-1 border-primary text-primary hover:bg-primary hover:text-white">
          {added ? <><Check size={18} /> Added!</> : <><ShoppingCart size={18} /> Add to Cart</>}
        </Button>
        <Button onClick={handleBuyNow} size="lg" className="flex-1">
          <Zap size={18} /> Buy Now
        </Button>
      </div>
    </div>
  );
}
