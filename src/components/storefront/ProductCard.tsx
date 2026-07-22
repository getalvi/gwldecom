import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  const cover = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : null;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-secondary">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt_text ?? product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
              className="object-cover transition-transform group-hover:scale-105"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No image</div>
          )}
          {discount && (
            <span className="absolute left-2 top-2 rounded bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
              -{discount}%
            </span>
          )}
        </div>
        <CardContent className="space-y-1">
          <p className="line-clamp-2 text-sm leading-snug">{product.title}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-primary">{formatBDT(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(product.compare_at_price)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
