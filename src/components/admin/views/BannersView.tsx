'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Upload, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { BannerT } from '@/lib/types'

export function BannersView() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<BannerT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    position: '0',
    active: true,
  })

  function load() {
    setLoading(true)
    api<BannerT[]>('/api/banners?all=1')
      .then(setBanners)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/uploads', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setForm((f) => ({ ...f, imageUrl: data.url }))
      toast({ title: 'Image uploaded' })
    } catch (e: any) {
      toast({ title: e.message || 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function create() {
    if (!form.title || !form.imageUrl) {
      toast({ title: 'Title and image are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const banner = await api<BannerT>('/api/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || null,
          position: Number(form.position) || 0,
          active: form.active,
        }),
      })
      setBanners((prev) => [banner, ...prev])
      setOpen(false)
      setForm({ title: '', imageUrl: '', linkUrl: '', position: '0', active: true })
      toast({ title: 'Banner created' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete banner "${title}"?`)) return
    try {
      await api(`/api/banners/${id}`, { method: 'DELETE' })
    } catch {
      // route may not exist — ignore and remove locally
    }
    setBanners((prev) => prev.filter((b) => b.id !== id))
    toast({ title: 'Banner removed' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Banners</h1>
          <p className="text-sm text-ink-400">{banners.length} banners</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" /> New Banner
        </Button>
      </div>

      {loading ? (
        <Card className="py-12 text-center text-sm text-ink-400">Loading...</Card>
      ) : banners.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <ImageIcon size={36} className="text-ink-200" />
          <p className="text-sm text-ink-400">No banners yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-ink-100">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-ink-300">
                    <ImageIcon size={28} />
                  </div>
                )}
                <Badge
                  className={`absolute right-2 top-2 ${
                    b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {b.active ? 'Active' : 'Hidden'}
                </Badge>
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 text-sm font-semibold text-ink-900">{b.title}</p>
                {b.linkUrl && (
                  <p className="line-clamp-1 text-xs text-ink-400">→ {b.linkUrl}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-ink-400">Pos #{b.position}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => remove(b.id, b.title)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summer Sale"
              />
            </div>
            <div>
              <Label className="text-xs">Image *</Label>
              {form.imageUrl ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-ink-100">
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-500 shadow"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 hover:border-brand-400 hover:text-brand-500">
                  {uploading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                  <span className="text-xs">
                    {uploading ? 'Uploading...' : 'Click to upload image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadImage(f)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <div>
              <Label className="text-xs">Link URL (optional)</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="#/category/sale"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Position</Label>
                <Input
                  type="number"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 rounded-lg border border-ink-100 p-3 w-full">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) => setForm({ ...form, active: v })}
                  />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-brand-500 hover:bg-brand-600" disabled={saving} onClick={create}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
