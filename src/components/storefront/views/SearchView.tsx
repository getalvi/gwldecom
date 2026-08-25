'use client'
import { useEffect, useState } from 'react'
import { Search as SearchIcon, X, Clock, TrendingUp, Trash2 } from 'lucide-react'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useUi } from '@/lib/ui-store'
import type { ProductT } from '@/lib/types'

// Trending/suggested searches shown to users to encourage discovery.
const SUGGESTED = ['Samsung', 'iPhone', 'Headphones', 'Nike', 'Air Fryer', 'Face Wash']

export function SearchView({ q, tag, featured }: { q?: string; tag?: string; featured?: string }) {
  const [term, setTerm] = useState(q || '')
  const [results, setResults] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)
  const [searched, setSearched] = useState(q || '')
  const recentSearches = useUi((s) => s.recentSearches)
  const pushSearch = useUi((s) => s.pushRecentSearch)
  const clearSearches = useUi((s) => s.clearRecentSearches)

  useEffect(() => {
    // Sync search state from URL query (derived from props).

    setTerm(q || '')
    setSearched(q || '')
    setLoading(true)
    if (tag) {
      api<{ items: ProductT[] }>(`/api/products?tag=${encodeURIComponent(tag)}&limit=24`)
        .then((r) => setResults(r.items))
        .finally(() => setLoading(false))
    } else if (featured) {
      api<{ items: ProductT[] }>(`/api/products?featured=1&limit=24`)
        .then((r) => setResults(r.items))
        .finally(() => setLoading(false))
    } else if (q) {
      pushSearch(q)
      api<{ items: ProductT[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.items))
        .finally(() => setLoading(false))
    } else {
      setResults([])
      setLoading(false)
    }
  }, [q, tag, featured, pushSearch])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = term.trim()
    if (t) navigate(`/search?q=${encodeURIComponent(t)}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <form onSubmit={submit} className="relative mx-auto max-w-2xl">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search for products, brands and categories..."
          className="h-11 border-ink-200 pl-10 pr-10"
          autoFocus
        />
        {term ? (
          <button
            type="button"
            onClick={() => { setTerm(''); navigate('/search') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            <X size={16} />
          </button>
        ) : null}
      </form>

      <div className="mx-auto mt-6 max-w-7xl">
        <p className="mb-4 text-sm text-ink-500">
          {searched ? <>Showing results for <span className="font-semibold text-ink-900">“{searched}”</span></>
            : tag ? <>Products tagged <span className="font-semibold text-ink-900">#{tag}</span></>
            : featured ? <>Featured deals</>
            : 'Type to search'}
          {results.length > 0 ? <span> — {results.length} found</span> : null}
        </p>

        {/* Recent + suggested searches — shown when no active query */}
        {!q && !tag && !featured ? (
          <div className="mx-auto max-w-2xl space-y-6">
            {recentSearches.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <Clock size={13} /> Recent Searches
                  </h3>
                  <button
                    onClick={clearSearches}
                    className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-red-500"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                      className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Clock size={11} className="text-ink-400" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <TrendingUp size={13} /> Popular Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                    className="rounded-full bg-ink-50 px-3 py-1.5 text-xs text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <SearchIcon size={48} className="mx-auto mb-3 text-ink-200" />
            <p className="text-sm text-ink-400">
              {searched ? 'No products match your search.' : 'Start searching for products.'}
            </p>
            <Button variant="link" onClick={() => navigate('/')}>Browse all products</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
