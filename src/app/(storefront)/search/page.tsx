import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import type { Metadata } from "next";

interface Props { searchParams: Promise<{ q?: string; categoryId?: string; sort?: string; page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Browse Products" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, categoryId, sort, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));
  const pageSize = 24;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, title, slug, price, compare_at_price, currency, product_images(url, alt_text, position)", { count: "exact" })
    .eq("status", "published")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q) query = query.textSearch("title", q, { type: "websearch" });
  if (categoryId) query = query.eq("category_id", categoryId);
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: products, count } = await query;
  const { data: categories } = await supabase.from("categories").select("id, name, slug").order("name");

  return (
    <main className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{q ? `Results for "${q}"` : "All Products"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{count ?? 0} products found</p>
        </div>
        <form method="GET" action="/search">
          {q && <input type="hidden" name="q" value={q} />}
          {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
          <select name="sort" defaultValue={sort ?? ""} onChange={e => e.currentTarget.form?.submit()}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters sidebar */}
        <aside className="md:col-span-1">
          <div className="rounded-xl border border-border bg-background p-4 sticky top-20">
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="space-y-1">
              <a href="/search" className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${!categoryId ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}>
                All Categories
              </a>
              {(categories ?? []).map(cat => (
                <a key={cat.id} href={`/search?categoryId=${cat.id}${q ? `&q=${q}` : ""}`}
                  className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${categoryId === cat.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}>
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="md:col-span-3">
          <ProductGrid products={products ?? []} />
          {/* Pagination */}
          {(count ?? 0) > pageSize && (
            <div className="flex justify-center gap-2 mt-8">
              {page > 1 && (
                <a href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { categoryId } : {}), ...(sort ? { sort } : {}), page: String(page - 1) })}`}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">← Prev</a>
              )}
              <span className="rounded-md border border-primary bg-primary/10 text-primary px-4 py-2 text-sm font-medium">{page}</span>
              {page * pageSize < (count ?? 0) && (
                <a href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { categoryId } : {}), ...(sort ? { sort } : {}), page: String(page + 1) })}`}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">Next →</a>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
