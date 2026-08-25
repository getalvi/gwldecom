'use client'

import { useState } from 'react'
import { Check, X, Loader2, Pencil, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { navigate } from '@/lib/router'

type LowStockItem = {
  id: string
  title: string
  slug: string
  sku: string
  price: number
  stockQuantity: number
  status: string
  images?: { url: string }[]
}

export function LowStockList({ items, threshold }: { items: LowStockItem[]; threshold: number }) {
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [localItems, setLocalItems] = useState(items)

  function startEdit(item: LowStockItem) {
    setEditingId(item.id)
    setEditValue(String(item.stockQuantity))
  }
  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }
  async function saveEdit(item: LowStockItem) {
    const newVal = Math.max(0, Math.floor(Number(editValue)))
    if (Number.isNaN(newVal)) {
      toast({ title: 'Enter a valid number', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const updated = await api<{ stockQuantity: number }>(
        `/api/products/${item.slug}/stock`,
        { method: 'PATCH', body: JSON.stringify({ stockQuantity: newVal }) }
      )
      setLocalItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, stockQuantity: updated.stockQuantity } : p))
      )
      toast({ title: 'Stock updated', description: `${item.title}: ${updated.stockQuantity} units` })
      setEditingId(null)
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (localItems.length === 0) {
    return (
      <Card className="flex items-center gap-3 border-ink-100 bg-white p-4">
        <AlertTriangle size={18} className="text-emerald-600" />
        <p className="text-sm text-ink-600">No products below {threshold} units. Stock healthy.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Low Stock ({localItems.length})</h2>
          <p className="text-xs text-ink-400">Click the pencil to restock inline</p>
        </div>
        <Button size="sm" variant="ghost" className="text-brand-600" onClick={() => navigate('/admin/products')}>
          View all
        </Button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto scroll-thin pr-1">
        {localItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-ink-50">
              {item.images?.[0]?.url ? (
                 
                <img src={item.images[0].url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs font-medium text-ink-900">{item.title}</p>
              <p className="text-[11px] text-ink-400">{item.sku}</p>
            </div>
            {editingId === item.id ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 w-20 px-2 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(item)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-600"
                  disabled={saving}
                  onClick={() => saveEdit(item)}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-ink-400"
                  disabled={saving}
                  onClick={cancelEdit}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    item.stockQuantity === 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }
                >
                  {item.stockQuantity} left
                </Badge>
                <button
                  onClick={() => startEdit(item)}
                  className="grid h-7 w-7 place-items-center rounded-md text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                  aria-label="Edit stock"
                  title="Edit stock"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
