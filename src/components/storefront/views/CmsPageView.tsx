'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FileText } from 'lucide-react'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import type { PageT } from '@/lib/types'

export function CmsPageView({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageT | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api<PageT>(`/api/pages/${slug}`)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink-400">Loading...</div>
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <FileText size={48} className="mx-auto mb-3 text-ink-200" />
        <h1 className="text-xl font-bold text-ink-900">Page Not Found</h1>
        <p className="mt-1 text-sm text-ink-400">The page you’re looking for doesn’t exist.</p>
        <Link href="#/" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-400">
        <Link href="#/" className="hover:text-brand-600">Home</Link>
        <ChevronRight size={12} />
        <span className="text-ink-600">{page.title}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-ink-900 sm:text-3xl">{page.title}</h1>
      <BlockRenderer blocks={page.blocks} />
    </div>
  )
}
