import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(url, alt_text, position), categories(name, slug)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.title,
    description: product.description?.slice(0, 160),
    openGraph: {
      images: product.product_images?.[0]?.url ? [product.product_images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
  const specs = (product.specifications ?? {}) as Record<string, string>;

  return (
    <main className="container grid gap-8 py-6 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
        {images[0] && (
          <Image
            src={images[0].url}
            alt={images[0].alt_text ?? product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="mt-2 text-3xl font-bold text-primary">{formatBDT(product.price)}</p>
        <AddToCartButton
          productId={product.id}
          title={product.title}
          price={product.price}
          imageUrl={images[0]?.url ?? null}
        />
        <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>

        {Object.keys(specs).length > 0 && (
          <table className="mt-6 w-full text-sm">
            <tbody>
              {Object.entries(specs).map(([key, value]) => (
                <tr key={key} className="border-b border-border">
                  <td className="py-2 pr-4 font-medium capitalize">{key}</td>
                  <td className="py-2 text-muted-foreground">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
