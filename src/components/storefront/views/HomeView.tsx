'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Headphones } from 'lucide-react'
import { BannerCarouselBlock } from '@/components/blocks/BannerCarousel'
import { ProductGridBlock } from '@/components/blocks/ProductGrid'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { RecentlyViewed } from '@/components/storefront/RecentlyViewed'
import { RecentSearches } from '@/components/storefront/RecentSearches'
import { BundleDealsSection } from '@/components/storefront/BundleDealsSection'
import { api } from '@/lib/api'
import type { CategoryT, ProductT } from '@/lib/types'

const TRUST_BADGES = [
  { icon: Truck, title: 'Nationwide Delivery', sub: 'All 64 districts' },
  { icon: ShieldCheck, title: 'Genuine Products', sub: '100% authentic' },
  { icon: RefreshCw, title: 'Easy Returns', sub: 'Within 7 days' },
  { icon: Headphones, title: '24/7 Support', sub: 'Always here to help' },
]

export function HomeView() {
  const [cats, setCats] = useState<CategoryT[]>([])
  const [featured, setFeatured] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ flat: CategoryT[] }>('/api/categories').then((r) => {
      setCats(r.flat.filter((c) => !c.parentId))
    })
    api<{ items: ProductT[] }>('/api/products?featured=1&limit=10')
      .then((r) => setFeatured(r.items))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Hero + trust badges layout */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <BannerCarouselBlock props={{ autoplay: true }} />
        </div>
        <div className="hidden grid-cols-1 gap-3 lg:grid lg:grid-cols-1">
          {TRUST_BADGES.slice(0, 2).map((b) => (
            <div
              key={b.title}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <b.icon size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{b.title}</p>
                <p className="text-xs text-ink-400">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* trust badges row */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TRUST_BADGES.map((b) => (
          <div
            key={b.title}
            className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-white p-3"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <b.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink-900">{b.title}</p>
              <p className="truncate text-[11px] text-ink-400">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900 sm:text-xl">Shop by Category</h2>
          <Link href="#/" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {cats.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-ink-100" />
              ))
            : cats.map((c) => (
                <Link
                  key={c.id}
                  href={`#/category/${c.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-ink-50">
                    { }
                    <img
                      src={c.imageUrl || ''}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-center text-xs font-medium text-ink-700 group-hover:text-brand-600">
                    {c.name}
                  </span>
                </Link>
              ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900 sm:text-xl">⚡ Flash Deals</h2>
            <p className="text-xs text-ink-400">Limited-time discounts on top products</p>
          </div>
          <Link
            href="#/search?featured=1"
            className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Deal of the day banner */}
      <section className="mt-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 p-6 text-white sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Use code</p>
              <p className="text-2xl font-extrabold sm:text-3xl">WELCOME10</p>
              <p className="mt-1 text-sm text-white/90">Get 10% off your first order above ৳1000</p>
            </div>
            <Link
              href="#/cart"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-600 transition hover:scale-105"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Bundle deals */}
      <BundleDealsSection />

      {/* Product grid block: new arrivals */}
      <section className="mt-8">
        <ProductGridBlock props={{ title: 'New Arrivals', limit: 10 }} />
      </section>

      {/* Recent searches (only shows once the user has searched) */}
      <RecentSearches />

      {/* Recently viewed (only shows once the user has browsed products) */}
      <RecentlyViewed limit={6} />
    </div>
  )
}
