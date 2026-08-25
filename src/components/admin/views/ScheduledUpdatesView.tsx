'use client'

import { useEffect, useState } from 'react'
import { Clock, Calendar, CheckCircle2, Play, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

type Update = {
  id: string
  productId: string
  field: string
  value: number
  applyAt: string
  applied: boolean
  appliedAt: string | null
  createdAt: string
  product: { id: string; title: string; slug: string; price: number; stockQuantity: number }
}

export function ScheduledUpdatesView() {
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api<{ items: Update[] }>('/api/scheduled-updates')
      .then((r) => setUpdates(r.items))
      .finally(() => setLoading(false))
  }, [])

  async function applyDue() {
    setApplying(true)
    try {
      const res = await api<{ applied: number; totalDue: number }>('/api/scheduled-updates/apply', { method: 'POST' })
      toast({ title: `Applied ${res.applied} update(s)`, description: `${res.totalDue} were due` })
      // refresh
      const r = await api<{ items: Update[] }>('/api/scheduled-updates')
      setUpdates(r.items)
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setApplying(false)
    }
  }

  const pending = updates.filter((u) => !u.applied)
  const applied = updates.filter((u) => u.applied)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Scheduled Updates</h1>
          <p className="text-sm text-ink-400">Future price/stock changes that apply automatically.</p>
        </div>
        <Button onClick={applyDue} disabled={applying || pending.length === 0} className="bg-brand-500 hover:bg-brand-600">
          {applying ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Play size={14} className="mr-1" />}
          {applying ? 'Applying...' : `Apply Due (${pending.length})`}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-ink-400">Loading...</div>
      ) : updates.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock size={36} className="mx-auto mb-3 text-ink-200" />
          <p className="text-sm text-ink-400">No scheduled updates.</p>
          <p className="mt-1 text-xs text-ink-400">Schedule price or stock changes from the product editor.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink-700">Pending ({pending.length})</h2>
              <div className="space-y-2">
                {pending.map((u) => (
                  <Card key={u.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{u.product.title}</p>
                      <p className="text-xs text-ink-400">
                        {u.field === 'price' ? 'Price' : u.field === 'stockQuantity' ? 'Stock' : 'Compare-at'} →{' '}
                        {u.field === 'stockQuantity' ? Math.floor(u.value) : formatBDT(u.value)}{' '}
                        (current: {u.field === 'stockQuantity' ? u.product.stockQuantity : formatBDT(u.product.price)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-ink-700">
                        {new Date(u.applyAt).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-ink-400">{new Date(u.applyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Badge className="bg-amber-50 text-amber-700">Due</Badge>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {applied.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink-700">Applied ({applied.length})</h2>
              <div className="space-y-2">
                {applied.slice(0, 10).map((u) => (
                  <Card key={u.id} className="flex items-center gap-3 p-3 opacity-70">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{u.product.title}</p>
                      <p className="text-xs text-ink-400">
                        {u.field} → {u.field === 'stockQuantity' ? Math.floor(u.value) : formatBDT(u.value)}
                      </p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700">Applied</Badge>
                    <span className="text-xs text-ink-400">
                      {u.appliedAt ? new Date(u.appliedAt).toLocaleDateString() : ''}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
