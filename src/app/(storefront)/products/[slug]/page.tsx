import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Star, Shield, Truck, RotateCcw, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";

export const revalidate = 300;

interface Props { params: Promise<{ slug: string }> }

interface ProductImage { url: string; alt_text: string | null; position: number }
interface ProductRow {
  id: string; title: string; slug: string; description: string | null;
  price: number; compare_at_price: number | null; stock_quantity: number;
  specifications: Record<string, string>; brand_id: string | null;
  product_images: ProductImage[];
  categories: { name: string; slug: string } | null;
  brands: { name: string } | null;
}

async function getProduct(slug: string): Promise<ProductRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, slug, description, price, compare_at_price, stock_quantity, specifications, brand_id, product_images(url, alt_text, position), categories(name, slug), brands(name)")
    .eq("slug", slug).eq("status", "published").single();
  if (!data) return null;
  return {
    ...data,
    categories: Array.isArray(data.categories) ? (data.categories[0] ?? null) : data.categories,
    brands: Array.isArray(data.brands) ? (data.brands[0] ?? null) : data.brands,
  } as unknown as ProductRow;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const cover = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  return {
    title: product.title,
    description: product.description?.slice(0, 160),
    openGraph: { title: product.title, description: product.description?.slice(0, 160) ?? "", images: cover ? [{ url: cover.url }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const images = [...product.product_images].sort((a, b) => a.position - b.position);
  const specs = product.specifications ?? {};
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100) : null;

  return (
    <main className="container py-6 animate-fade-in">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/" className="hover:text-primary">Home</a>
        <span>/</span>
        {product.categories && <a href={`/search?categorySlug=${product.categories.slug}`} className="hover:text-primary capitalize">{product.categories.name}</a>}
        {product.categories && <span>/</span>}
        <span className="text-foreground line-clamp-1">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary border border-border">
            {images[0] ? (
              <Image src={images[0].url} alt={images[0].alt_text ?? product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
            )}
            {discount && (
              <span className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-white">-{discount}% OFF</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(1).map((img, i) => (
                <div key={i} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-colors">
                  <Image src={img.url} alt={img.alt_text ?? product.title} fill className="object-cover" sizes="64px" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {product.brands && <p className="text-sm font-medium text-primary">{product.brands.name}</p>}
          <h1 className="text-2xl font-bold leading-snug">{product.title}</h1>
          <div className="flex items-center gap-2">
            <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={16} className="text-warning fill-warning" />)}</div>
            <span className="text-sm text-muted-foreground">(0 reviews)</span>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-extrabold text-primary">{formatBDT(product.price)}</p>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <p className="text-lg text-muted-foreground line-through pb-0.5">{formatBDT(product.compare_at_price)}</p>
            )}
            {discount && <span className="text-sm font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Save {discount}%</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${product.stock_quantity > 0 ? "bg-success" : "bg-destructive"}`} />
            <span className="text-sm font-medium">
              {product.stock_quantity > 0 ? product.stock_quantity < 10 ? `Only ${product.stock_quantity} left!` : `In Stock (${product.stock_quantity})` : "Out of Stock"}
            </span>
          </div>
          <AddToCartButton productId={product.id} title={product.title} price={product.price} imageUrl={images[0]?.url ?? null} slug={product.slug} inStock={product.stock_quantity > 0} />
          <div className="grid grid-cols-2 gap-3">
            {[{ icon: Truck, label: "Free Delivery", sub: "On orders over ৳999" }, { icon: RotateCcw, label: "Easy Returns", sub: "7-day return policy" }, { icon: Shield, label: "Genuine Product", sub: "100% authentic" }, { icon: Package, label: "Secure Packaging", sub: "Safe delivery" }].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <Icon size={18} className="text-primary shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {product.description && (
          <div className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-3">Description</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}
        {Object.keys(specs).length > 0 && (
          <div className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-3">Specifications</h2>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(specs).map(([key, value]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium capitalize text-muted-foreground w-2/5">{key}</td>
                    <td className="py-2">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
