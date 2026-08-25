'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, SlidersHorizontal, X, Star, Check } from 'lucide-react'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import type { CategoryT, ProductT, BrandT } from '@/lib/types'

export function CategoryView({ slug, sub }: { slug: string; sub?: string }) {
  const [cat, setCat] = useState<CategoryT | null>(null)
  const [products, setProducts] = useState<ProductT[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [sort, setSort] = useState('newest')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000])
  const [activeSub, setActiveSub] = useState<string | undefined>(sub)
  const [brands, setBrands] = useState<BrandT[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)

  useEffect(() => {
    api<{ flat: CategoryT[] }>('/api/categories').then(() => {}).catch(() => {})
    api<BrandT[]>('/api/brands').then(setBrands).catch(() => {})
  }, [])

  useEffect(() => {
    api<CategoryT>(`/api/categories/${slug}`).then(setCat).catch(() => {})
    setActiveSub(undefined)
    setSelectedBrands([])
    setMinRating(0)
    setPriceRange([0, 200000])
    setPage(1)
  }, [slug])

  useEffect(() => {
    setLoading(true)
    const activeCat = activeSub || slug
    const params = new URLSearchParams({
      category: activeCat,
      sort,
      page: String(page),
      limit: '24',
      minPrice: String(priceRange[0]),
      maxPrice: String(priceRange[1]),
    })
    api<{ items: ProductT[]; total: number; pages: number }>(`/api/products?${params}`)
      .then((r) => {
        // Apply client-side brand + rating filters (the list API already
        // returns reviewStats per product, so we can filter in memory).
        let filtered = r.items
        if (selectedBrands.length > 0) {
          filtered = filtered.filter((p) => p.brand?.slug && selectedBrands.includes(p.brand.slug))
        }
        if (minRating > 0) {
          filtered = filtered.filter((p) => {
            const rs = (p as any).reviewStats as { avg: number; count: number } | undefined
            return rs && rs.count > 0 && rs.avg >= minRating
          })
        }
        setProducts(filtered)
        setTotal(r.total)
        setPages(r.pages)
      })
      .finally(() => setLoading(false))
  }, [slug, activeSub, sort, page, priceRange, selectedBrands, minRating])

  const breadcrumbs = cat?.parent ? [cat.parent, cat] : [cat].filter(Boolean) as CategoryT[]

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1 text-xs text-ink-400">
        <Link href="#/" className="hover:text-brand-600">Home</Link>
        <ChevronRight size={12} />
        {breadcrumbs.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <Link href={`#/category/${c.slug}`} className="hover:text-brand-600">{c.name}</Link>
            {i < breadcrumbs.length - 1 ? <ChevronRight size={12} /> : null}
          </span>
        ))}
      </nav>

      {/* Category header */}
      {cat ? (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-lg bg-ink-100">
            {cat.imageUrl ? (
               
              <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{cat.name}</h1>
            <p className="text-xs text-ink-400">{total} products found</p>
          </div>
        </div>
      ) : null}

      {/* Subcategory chips */}
      {cat?.children?.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveSub(undefined); setPage(1) }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !activeSub ? 'bg-brand-500 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
            }`}
          >
            All
          </button>
          {cat.children.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSub(s.slug); setPage(1) }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeSub === s.slug ? 'bg-brand-500 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-4">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <FiltersPanel
            sort={sort}
            setSort={setSort}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onApply={() => setPage(1)}
            brands={brands}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
            minRating={minRating}
            setMinRating={setMinRating}
          />
        </aside>

        {/* Mobile filter sheet */}
        <div className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal size={14} className="mr-1" /> Filters
                  {(selectedBrands.length > 0 || minRating > 0) && (
                    <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] text-white">
                      {selectedBrands.length + (minRating > 0 ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <FiltersPanel
                    sort={sort}
                    setSort={setSort}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onApply={() => setPage(1)}
                    brands={brands}
                    selectedBrands={selectedBrands}
                    setSelectedBrands={setSelectedBrands}
                    minRating={minRating}
                    setMinRating={setMinRating}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-400 sm:inline">Sort:</span>
              <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="title">Name: A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-ink-400">No products found in this range.</p>
              <Button variant="link" onClick={() => { setPriceRange([0, 200000]); setPage(1) }}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 ? (
            <div className="mt-6 flex justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              {Array.from({ length: pages }).slice(0, 7).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  className={page === i + 1 ? 'bg-brand-500' : ''}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function FiltersPanel({
  sort,
  setSort,
  priceRange,
  setPriceRange,
  onApply,
  brands,
  selectedBrands,
  setSelectedBrands,
  minRating,
  setMinRating,
}: {
  sort: string
  setSort: (v: string) => void
  priceRange: [number, number]
  setPriceRange: (v: [number, number]) => void
  onApply: () => void
  brands: BrandT[]
  selectedBrands: string[]
  setSelectedBrands: (v: string[]) => void
  minRating: number
  setMinRating: (v: number) => void
}) {
  function toggleBrand(slug: string) {
    if (selectedBrands.includes(slug)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== slug))
    } else {
      setSelectedBrands([...selectedBrands, slug])
    }
    onApply()
  }
  const activeFilterCount =
    selectedBrands.length + (minRating > 0 ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0)
  function clearAll() {
    setSelectedBrands([])
    setMinRating(0)
    setPriceRange([0, 200000])
    onApply()
  }
  return (
    <div className="space-y-5 rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Filters {activeFilterCount > 0 && <span className="text-brand-600">({activeFilterCount})</span>}
        </span>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-[11px] text-brand-600 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div>
        <Label className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Sort By
        </Label>
        <Select value={sort} onValueChange={(v) => { setSort(v); onApply() }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="title">Name: A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Price Range
          </Label>
          {priceRange[0] > 0 || priceRange[1] < 200000 ? (
            <button onClick={() => { setPriceRange([0, 200000]); onApply() }}>
              <X size={12} className="text-ink-400 hover:text-ink-600" />
            </button>
          ) : null}
        </div>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
            onValueCommit={onApply}
            min={0}
            max={200000}
            step={1000}
            className="py-2"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span>৳{priceRange[0].toLocaleString()}</span>
          <span>৳{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {/* Brand multi-select */}
      {brands.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Brand
            </Label>
            {selectedBrands.length > 0 && (
              <button onClick={() => { setSelectedBrands([]); onApply() }} className="text-[11px] text-brand-600 hover:underline">
                Reset
              </button>
            )}
          </div>
          <div className="max-h-44 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-ink-700 hover:bg-ink-50"
              >
                <Checkbox
                  checked={selectedBrands.includes(b.slug)}
                  onCheckedChange={() => toggleBrand(b.slug)}
                  className="h-3.5 w-3.5"
                />
                <span className="flex-1">{b.name}</span>
                {selectedBrands.includes(b.slug) && (
                  <Check size={12} className="text-brand-600" />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Min rating */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Min Rating
          </Label>
          {minRating > 0 && (
            <button onClick={() => { setMinRating(0); onApply() }} className="text-[11px] text-brand-600 hover:underline">
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          {[4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => { setMinRating(minRating === r ? 0 : r); onApply() }}
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${
                minRating === r ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              <span className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={s <= r ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}
                  />
                ))}
              </span>
              <span>& up</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
