import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { formatBDT } from "@/lib/utils";
import { ChevronRight, Zap, Star, TrendingUp } from "lucide-react";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: products }, { data: banners }, { data: categories }] = await Promise.all([
    supabase.from("products")
      .select("id, title, slug, price, compare_at_price, currency, product_images(url, alt_text, position)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("banners").select("*").eq("active", true).order("position").limit(5),
    supabase.from("categories").select("id, name, slug, image_url").limit(12),
  ]);

  const featured = products?.slice(0, 8) ?? [];
  const newArrivals = products?.slice(0, 10) ?? [];
  const flashSale = products?.filter((_, i) => i % 3 === 0).slice(0, 6) ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/20">
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Main hero */}
            <div className="lg:col-span-3 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 min-h-[320px] flex flex-col justify-end">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800')] bg-cover bg-center opacity-20" />
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-80">New Collection</span>
                <h1 className="mt-1 text-4xl font-extrabold leading-tight">Shop The Best<br />Deals in BD</h1>
                <p className="mt-2 text-sm opacity-90">Explore thousands of products with fast delivery</p>
                <Link href="/search" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-primary px-5 py-2 text-sm font-semibold hover:bg-white/90 transition-colors">
                  Shop Now <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            {/* Side banners */}
            <div className="lg:col-span-2 grid grid-rows-2 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mb-8" />
                <Zap size={28} className="text-white/80" />
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">Flash Sale</p>
                  <p className="text-xl font-bold">Up to 70% off</p>
                  <Link href="/search?sale=true" className="text-xs underline mt-1 inline-block">Shop Flash →</Link>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mb-8" />
                <TrendingUp size={28} className="text-white/80" />
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">Trending</p>
                  <p className="text-xl font-bold">New Arrivals</p>
                  <Link href="/search?sort=newest" className="text-xs underline mt-1 inline-block">Explore →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {(categories?.length ?? 0) > 0 && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Shop by Category</h2>
            <Link href="/search" className="text-sm text-primary hover:underline flex items-center gap-1">
              All categories <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/search?categoryId=${cat.id}`}
                className="group flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-secondary transition-colors text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {cat.image_url
                    ? <Image src={cat.image_url} alt={cat.name} width={48} height={48} className="object-cover" />
                    : <span className="text-xl">{cat.name.charAt(0)}</span>}
                </div>
                <span className="text-xs font-medium line-clamp-2 leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash Sale */}
      {flashSale.length > 0 && (
        <section className="container py-6">
          <div className="rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-6 border border-red-100 dark:border-red-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="text-primary" size={22} />
                <h2 className="text-xl font-bold">Flash Sale</h2>
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
              </div>
              <Link href="/search?sale=true" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <ProductGrid products={flashSale} />
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="text-warning" size={20} />
              <h2 className="text-xl font-bold">Featured Products</h2>
            </div>
            <Link href="/search" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-success" size={20} />
              <h2 className="text-xl font-bold">New Arrivals</h2>
            </div>
            <Link href="/search?sort=newest" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <ProductGrid products={newArrivals} />
        </section>
      )}

      {/* Newsletter */}
      <section className="container py-10">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 text-center">
          <h2 className="text-2xl font-bold">Get Exclusive Deals</h2>
          <p className="mt-1 text-sm opacity-90">Subscribe to our newsletter for the latest offers</p>
          <form className="mt-4 flex max-w-md mx-auto gap-2">
            <input type="email" placeholder="Your email address" className="flex-1 rounded-lg px-4 py-2 text-foreground text-sm focus:outline-none" />
            <button type="submit" className="rounded-lg bg-white text-primary px-5 py-2 text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 mt-8">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="font-bold text-lg mb-3"><span className="text-primary">Shop</span>BD</p>
            <p className="text-sm text-muted-foreground">Bangladesh&apos;s trusted online marketplace. Fast delivery, genuine products.</p>
          </div>
          <div>
            <p className="font-semibold mb-3">Customer Service</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Track Order", "Returns", "FAQ", "Contact Us"].map(l => <li key={l}><Link href="#" className="hover:text-primary">{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["About Us", "Careers", "Press", "Blog"].map(l => <li key={l}><Link href="#" className="hover:text-primary">{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Payment Methods</p>
            <div className="flex flex-wrap gap-2">
              {["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "COD"].map(p => (
                <span key={p} className="text-xs border border-border rounded px-2 py-1 bg-background">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ShopBD. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
