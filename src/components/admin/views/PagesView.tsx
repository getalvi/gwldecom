'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { api, slugify } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { PageT } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-ink-50 text-ink-600',
}

export function PagesView() {
  const { toast } = useToast()
  const [pages, setPages] = useState<PageT[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStatus, setNewStatus] = useState<'draft' | 'published'>('draft')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoading(true)
    api<PageT[]>('/api/pages?all=1')
      .then(setPages)
      .finally(() => setLoading(false))
  }, [])

  async function createPage() {
    if (!newTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const page = await api<PageT>('/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          slug: slugify(newTitle),
          status: newStatus,
          blocks: [],
        }),
      })
      toast({ title: 'Page created' })
      setCreateOpen(false)
      setNewTitle('')
      setNewStatus('draft')
      navigate(`/admin/pages/edit/${page.slug}`)
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  async function remove(slug: string, title: string) {
    if (!confirm(`Delete page "${title}"? This cannot be undone.`)) return
    try {
      await api(`/api/pages/${slug}`, { method: 'DELETE' })
      setPages((prev) => prev.filter((p) => p.slug !== slug))
      toast({ title: 'Page deleted' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Pages</h1>
          <p className="text-sm text-ink-400">{pages.length} pages</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-1" /> New Page
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <FileText size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No pages yet. Create one to start.</p>
                  </td>
                </tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-medium text-ink-900">{p.title}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-ink-50 px-1.5 py-0.5 text-xs text-ink-600">/{p.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[p.status] || 'bg-ink-50 text-ink-600'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/admin/pages/edit/${p.slug}`)}
                          title="Edit in Page Builder"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => remove(p.slug, p.title)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. About Us"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={newStatus} onValueChange={(v: 'draft' | 'published') => setNewStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-ink-400">
              You will be taken to the Page Builder after creation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-brand-500 hover:bg-brand-600" disabled={creating} onClick={createPage}>
              {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
