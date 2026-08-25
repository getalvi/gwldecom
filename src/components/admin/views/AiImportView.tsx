'use client'

import { useEffect, useState } from 'react'
import { Check, X, Sparkles, Loader2, Download, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { ImportJobT } from '@/lib/types'

interface AiDraft {
  id: string
  imageUrl: string | null
  status: string
  extractedData: Record<string, unknown>
  createdAt: string
}

interface ImportJobRow extends ImportJobT {
  _count?: { items: number; logs: number }
}

export function AiImportView() {
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<AiDraft[]>([])
  const [jobs, setJobs] = useState<ImportJobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  function load() {
    setLoading(true)
    Promise.all([
      api<AiDraft[]>('/api/ai-drafts'),
      api<ImportJobRow[]>('/api/import-jobs'),
    ])
      .then(([d, j]) => {
        setDrafts(d)
        setJobs(j)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function actOnDraft(id: string, action: 'approve' | 'reject') {
    setBusy((b) => ({ ...b, [id]: true }))
    try {
      await api('/api/ai-drafts', {
        method: 'PATCH',
        body: JSON.stringify({ id, action }),
      })
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      toast({
        title: action === 'approve' ? 'Draft approved → product created' : 'Draft rejected',
      })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">AI Import</h1>
        <p className="text-sm text-ink-400">Approve AI-scraped product drafts and monitor import jobs.</p>
      </div>

      {/* Pending AI Drafts */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-900">Pending AI Drafts</h2>
          <Badge className="bg-brand-50 text-brand-700">{drafts.length}</Badge>
        </div>

        {loading ? (
          <Card className="py-12 text-center text-sm text-ink-400">Loading...</Card>
        ) : drafts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Sparkles size={36} className="text-ink-200" />
            <p className="text-sm text-ink-400">No pending drafts.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((d) => {
              const data = d.extractedData || {}
              const title = String(data.title || 'Untitled')
              const description = String(data.description || '')
              const price = Number(data.price) || 0
              const stock = Number(data.stock) || 0
              const confidence = data.confidence ? Number(data.confidence) : null
              return (
                <Card key={d.id} className="flex flex-col overflow-hidden">
                  <div className="relative aspect-[4/3] bg-ink-100">
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-ink-300">
                        <ImageOff size={28} />
                      </div>
                    )}
                    {confidence !== null && (
                      <Badge
                        className={`absolute right-2 top-2 ${
                          confidence >= 0.8
                            ? 'bg-emerald-100 text-emerald-700'
                            : confidence >= 0.5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {Math.round(confidence * 100)}% conf.
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-ink-900">{title}</p>
                    {description && (
                      <p className="line-clamp-2 text-xs text-ink-400">{description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-brand-600">{formatBDT(price)}</span>
                      <span className="text-xs text-ink-400">Stock: {stock}</span>
                    </div>
                    <div className="mt-auto flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        disabled={busy[d.id]}
                        onClick={() => actOnDraft(d.id, 'approve')}
                      >
                        {busy[d.id] ? (
                          <Loader2 size={14} className="mr-1 animate-spin" />
                        ) : (
                          <Check size={14} className="mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={busy[d.id]}
                        onClick={() => actOnDraft(d.id, 'reject')}
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Import Jobs */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-900">Import Jobs</h2>
          <Badge className="bg-brand-50 text-brand-700">{jobs.length}</Badge>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-ink-400">Loading...</td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-ink-400">
                      No import jobs yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => {
                    const pct = j.total > 0 ? Math.round((j.done / j.total) * 100) : 0
                    return (
                      <tr key={j.id} className="hover:bg-ink-50/50">
                        <td className="px-4 py-3 font-medium text-ink-900">{j.source}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              j.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : j.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : j.status === 'running'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-ink-50 text-ink-600'
                            }
                          >
                            {j.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 w-24" />
                            <span className="text-xs text-ink-500">
                              {j.done}/{j.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {j._count?.items ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-400">
                          {new Date(j.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
