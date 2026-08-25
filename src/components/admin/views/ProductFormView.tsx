'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Upload, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, formatBDT, slugify } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { CategoryT, BrandT } from '@/lib/types'

interface ImageItem {
  url: string
  altText: string
  position: number
}

export function ProductFormView({ mode, slug }: { mode: 'new' | 'edit'; slug?: string }) {
  const { toast } = useToast()
  const [cats, setCats] = useState<CategoryT[]>([])
  const [brands, setBrands] = useState<BrandT[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit')

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    compareAtPrice: '',
    stockQuantity: '',
    sku: '',
    status: 'draft',
    categoryId: '',
    brandId: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>([])
  const [attrs, setAttrs] = useState<Array<{ key: string; values: string }>>([])
  const [images, setImages] = useState<ImageItem[]>([])

  useEffect(() => {
    Promise.all([
      api<{ flat: CategoryT[] }>('/api/categories'),
      api<BrandT[]>('/api/brands'),
    ]).then(([c, b]) => {
      setCats(c.flat)
      setBrands(b)
    })
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !slug) return
    setLoadingExisting(true)
    api<any>(`/api/products/${slug}?status=all`)
      .then((p) => {
        setForm({
          title: p.title,
          slug: p.slug,
          description: p.description || '',
          price: String(p.price),
          compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
          stockQuantity: String(p.stockQuantity),
          sku: p.sku,
          status: p.status,
          categoryId: p.categoryId || '',
          brandId: p.brandId || '',
        })
        setTags((p.tags as string[]) || [])
        setSpecs(
          p.specifications
            ? Object.entries(p.specifications).map(([key, value]) => ({ key, value: String(value) }))
            : []
        )
        setAttrs(
          p.attributes
            ? Object.entries(p.attributes).map(([key, val]) => ({
                key,
                values: Array.isArray(val) ? (val as string[]).join(', ') : String(val),
              }))
            : []
        )
        setImages(
          (p.images || []).map((img: any) => ({
            url: img.url,
            altText: img.altText || '',
            position: img.position || 0,
          }))
        )
      })
      .finally(() => setLoadingExisting(false))
  }, [mode, slug])

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/uploads', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setImages((prev) => [
        ...prev,
        { url: data.url, altText: form.title, position: prev.length },
      ])
    } catch (e: any) {
      toast({ title: e.message || 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  function save() {
    if (!form.title || !form.sku) {
      toast({ title: 'Title and SKU are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      stockQuantity: Number(form.stockQuantity) || 0,
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      slug: form.slug || slugify(form.title),
      tags,
      specifications: specs.reduce((acc, s) => {
        if (s.key) acc[s.key] = s.value
        return acc
      }, {} as Record<string, string>),
      attributes: attrs.reduce((acc, a) => {
        if (a.key) acc[a.key] = a.values.split(',').map((v) => v.trim()).filter(Boolean)
        return acc
      }, {} as Record<string, string[]>),
      images,
    }
    const url = mode === 'edit' && slug ? `/api/products/${slug}` : '/api/products'
    const method = mode === 'edit' ? 'PUT' : 'POST'
    api(url, { method, body: JSON.stringify(payload) })
      .then(() => {
        toast({ title: mode === 'edit' ? 'Product updated' : 'Product created' })
        navigate('/admin/products')
      })
      .catch((e: any) => {
        toast({ title: e.message || 'Failed', variant: 'destructive' })
      })
      .finally(() => setSaving(false))
  }

  if (loadingExisting) {
    return <div className="py-12 text-center text-sm text-ink-400">Loading product...</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          {mode === 'edit' ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      {/* Basic info */}
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })}
              placeholder="Product title"
            />
          </div>
          <div>
            <Label className="text-xs">Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto-generated"
            />
          </div>
          <div>
            <Label className="text-xs">SKU *</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="unique-sku"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Product description..."
            />
          </div>
        </div>
      </Card>

      {/* Pricing & inventory */}
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Pricing & Inventory</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Price (৳)</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Compare-at Price</Label>
            <Input
              type="number"
              value={form.compareAtPrice}
              onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Stock</Label>
            <Input
              type="number"
              value={form.stockQuantity}
              onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Brand</Label>
            <Select value={form.brandId} onValueChange={(v) => setForm({ ...form, brandId: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tags */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
              #{t}
              <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Add tag and press Enter"
            className="h-9 max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={addTag}><Plus size={14} /></Button>
        </div>
      </Card>

      {/* Specifications */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Specifications</h2>
          <Button variant="outline" size="sm" onClick={() => setSpecs([...specs, { key: '', value: '' }])}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
        {specs.length === 0 ? (
          <p className="text-xs text-ink-400">No specifications. Add key-value pairs like “Display → 6.6 inch”.</p>
        ) : (
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s.key}
                  onChange={(e) => setSpecs(specs.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                  placeholder="Key (e.g. Display)"
                  className="h-9 flex-1"
                />
                <Input
                  value={s.value}
                  onChange={(e) => setSpecs(specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="Value (e.g. 6.6 inch)"
                  className="h-9 flex-1"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Attributes (variants) */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Attributes (Variants)</h2>
          <Button variant="outline" size="sm" onClick={() => setAttrs([...attrs, { key: '', values: '' }])}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
        {attrs.length === 0 ? (
          <p className="text-xs text-ink-400">No attributes. Add e.g. “Color → Red, Blue, Green”.</p>
        ) : (
          <div className="space-y-2">
            {attrs.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={a.key}
                  onChange={(e) => setAttrs(attrs.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                  placeholder="Key (e.g. Color)"
                  className="h-9 w-40"
                />
                <Input
                  value={a.values}
                  onChange={(e) => setAttrs(attrs.map((x, j) => j === i ? { ...x, values: e.target.value } : x))}
                  placeholder="Values, comma-separated"
                  className="h-9 flex-1"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => setAttrs(attrs.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Images */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Product Images</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
              { }
              <img src={img.url} alt={img.altText} className="h-full w-full object-cover" />
              <button
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-500 opacity-0 shadow transition group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 hover:border-brand-400 hover:text-brand-500">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span className="text-[10px]">{uploading ? 'Uploading...' : 'Upload'}</span>
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
        </div>
      </Card>

      {/* Actions */}
      <div className="sticky bottom-4 flex gap-2 rounded-xl border border-ink-100 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/admin/products')}>Cancel</Button>
        <Button className="flex-1 bg-brand-500 hover:bg-brand-600" disabled={saving} onClick={save}>
          {saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : null}
          {mode === 'edit' ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </div>
  )
}
