import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/storefront/ProductGrid";

// ISR: regenerate at most once every 5 minutes. Keeps serverless invocations
// and DB reads low on Vercel's free tier while staying reasonably fresh.
export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, slug, price, compare_at_price, currency, product_images(url, alt_text, position)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main className="container py-6">
      <h1 className="mb-4 text-xl font-bold">Latest Products</h1>
      <ProductGrid products={products ?? []} />
    </main>
  );
}
