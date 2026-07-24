"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { formatBDT } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  title: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  product_images: { url: string; alt_text: string | null; position: number }[];
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const [wishlisted, setWishlisted] = useState(false);

  const cover = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <div className="h-full rounded-xl border border-border bg-background overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="relative aspect-square bg-secondary overflow-hidden">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt_text ?? product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No image</div>
          )}
          {discount && (
            <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setWishlisted(v => !v);
            }}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
            aria-label="Add to wishlist"
          >
            <Heart
              size={14}
              className={wishlisted ? "fill-primary text-primary" : "text-muted-foreground"}
            />
          </button>
        </div>
        <div className="p-3 space-y-1">
          <p className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-primary transition-colors">{product.title}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-primary text-base">{formatBDT(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">{formatBDT(product.compare_at_price)}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 text-xs text-warning">
            {"★★★★★"}<span className="text-muted-foreground ml-1">(0)</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
