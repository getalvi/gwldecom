'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, GitCompareArrows, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCompare, COMPARE_MAX } from '@/lib/compare-store'
import { navigate } from '@/lib/router'
import { api } from '@/lib/api'
import type { ProductT } from '@/lib/types'

export function CompareBar() {
  const slugs = useCompare((s) => s.slugs)
  const isOpen = useCompare((s) => s.isOpen)
  const remove = useCompare((s) => s.remove)
  const clear = useCompare((s) => s.clear)
  const close = useCompare((s) => s.closeBar)
  const [titles, setTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slugs.length) return
    api<{ items: ProductT[] }>(
      `/api/compare?slugs=${encodeURIComponent(slugs.join(','))}`
    )
      .then((r) => {
        const m: Record<string, string> = {}
        for (const p of r.items) m[p.slug] = p.title
        setTitles(m)
      })
      .catch(() => {})
  }, [slugs])

  if (!isOpen || slugs.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white shadow-2xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2 text-brand-600">
          <GitCompareArrows size={20} />
          <span className="hidden text-sm font-semibold sm:inline">Compare</span>
          <Badge className="bg-brand-50 text-brand-700">
            {slugs.length}/{COMPARE_MAX}
          </Badge>
        </div>

        {/* selected items */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto scroll-thin">
          {slugs.map((slug) => (
            <div
              key={slug}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5"
            >
              <span className="max-w-[120px] truncate text-xs font-medium text-ink-700">
                {titles[slug] || slug}
              </span>
              <button
                onClick={() => remove(slug)}
                className="text-ink-400 hover:text-red-500"
                aria-label="Remove from compare"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="hidden text-ink-500 hover:text-red-500 sm:flex"
          >
            <Trash2 size={14} className="mr-1" /> Clear
          </Button>
          <Button
            size="sm"
            disabled={slugs.length < 2}
            onClick={() => {
              close()
              navigate('/compare')
            }}
            className="bg-brand-500 hover:bg-brand-600"
          >
            Compare <ArrowRight size={14} className="ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={close}
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
