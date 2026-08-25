'use client'
import { Clock, TrendingUp, X } from 'lucide-react'
import { useUi } from '@/lib/ui-store'
import { navigate } from '@/lib/router'

const SUGGESTED = ['Samsung', 'iPhone', 'Headphones', 'Nike', 'Air Fryer']

export function RecentSearches() {
  const recent = useUi((s) => s.recentSearches)
  if (recent.length === 0) return null

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-ink-900">Your Recent Searches</h2>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {recent.slice(0, 6).map((s) => (
          <button
            key={s}
            onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            <Clock size={11} className="text-ink-400" /> {s}
          </button>
        ))}
      </div>
    </section>
  )
}
