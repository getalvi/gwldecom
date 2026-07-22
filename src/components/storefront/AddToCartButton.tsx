"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

interface Props {
  productId: string;
  title: string;
  price: number;
  imageUrl: string | null;
}

export function AddToCartButton({ productId, title, price, imageUrl }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ productId, title, price, imageUrl });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="mt-6 flex gap-3">
      <Button onClick={handleAdd} variant="outline">
        {added ? "Added ✓" : "Add to Cart"}
      </Button>
      <Button
        onClick={() => {
          addItem({ productId, title, price, imageUrl });
          router.push("/cart");
        }}
      >
        Buy Now
      </Button>
    </div>
  );
}
