'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Pencil, Trash2, Package, Copy, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { ProductT } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-ink-50 text-ink-600',
  pending_review: 'bg-amber-50 text-amber-700',
  archived: 'bg-red-50 text-red-700',
}

export function ProductsView() {
  const [products, setProducts] = useState<ProductT[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '60', status: 'all' })
    if (q) params.set('q', q)
    api<{ items: ProductT[] }>(`/api/products?${params}`)
      .then((r) => setProducts(r.items))
      .finally(() => setLoading(false))
  }, [q])

  async function remove(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await api(`/api/products/${slug}`, { method: 'DELETE' })
      setProducts((prev) => prev.filter((p) => p.slug !== slug))
      toast({ title: 'Product deleted' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  async function clone(slug: string, title: string) {
    try {
      const cloned = await api<{ id: string; slug: string; title: string }>(`/api/products/${slug}/clone`, { method: 'POST' })
      toast({ title: 'Product duplicated', description: `${cloned.title} (draft)` })
      // navigate to edit the clone
      navigate(`/admin/products/edit/${cloned.slug}`)
    } catch (e: any) {
      toast({ title: e.message || 'Clone failed', variant: 'destructive' })
    }
  }

  const filtered = status === 'all' ? products : products.filter((p) => p.status === status)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Products</h1>
          <p className="text-sm text-ink-400">{filtered.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open('/api/products/export', '_blank')}>
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/products/import')}>
            <Upload size={16} className="mr-1" /> Import CSV
          </Button>
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/admin/products/new')}>
            <Plus size={16} className="mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Package size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No products found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-ink-50">
                          {p.images?.[0]?.url ? (
                             
                            <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium text-ink-900">{p.title}</p>
                          <p className="text-xs text-ink-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{formatBDT(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={p.stockQuantity <= 5 ? 'font-semibold text-red-600' : 'text-ink-600'}>
                        {p.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[p.status] || 'bg-ink-50 text-ink-600'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/admin/products/edit/${p.slug}`)}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ink-500 hover:text-brand-600"
                          onClick={() => clone(p.slug, p.title)}
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => remove(p.slug, p.title)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
