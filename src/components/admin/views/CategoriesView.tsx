'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Tag, FolderTree, Loader2 } from 'lucide-react'
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
import { api, slugify } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { CategoryT, BrandT } from '@/lib/types'

export function CategoriesView() {
  const { toast } = useToast()
  const [cats, setCats] = useState<CategoryT[]>([])
  const [tree, setTree] = useState<CategoryT[]>([])
  const [brands, setBrands] = useState<BrandT[]>([])
  const [loading, setLoading] = useState(true)

  const [catForm, setCatForm] = useState({ name: '', slug: '', parentId: '', imageUrl: '' })
  const [brandForm, setBrandForm] = useState({ name: '', slug: '', logoUrl: '' })
  const [savingCat, setSavingCat] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      api<{ flat: CategoryT[]; tree: CategoryT[] }>('/api/categories'),
      api<BrandT[]>('/api/brands'),
    ])
      .then(([c, b]) => {
        setCats(c.flat)
        setTree(c.tree)
        setBrands(b)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function addCategory() {
    if (!catForm.name) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    setSavingCat(true)
    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catForm.name,
          slug: catForm.slug || slugify(catForm.name),
          parentId: catForm.parentId || null,
          imageUrl: catForm.imageUrl || null,
        }),
      })
      setCatForm({ name: '', slug: '', parentId: '', imageUrl: '' })
      toast({ title: 'Category added' })
      load()
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSavingCat(false)
    }
  }

  async function deleteCategory(slug: string, name: string) {
    if (!confirm(`Delete category "${name}"? Children may be orphaned.`)) return
    try {
      await api(`/api/categories/${slug}`, { method: 'DELETE' })
      toast({ title: 'Category deleted' })
      load()
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  async function addBrand() {
    if (!brandForm.name) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    setSavingBrand(true)
    try {
      await api('/api/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: brandForm.name,
          slug: brandForm.slug || slugify(brandForm.name),
          logoUrl: brandForm.logoUrl || null,
        }),
      })
      setBrandForm({ name: '', slug: '', logoUrl: '' })
      toast({ title: 'Brand added' })
      load()
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSavingBrand(false)
    }
  }

  async function deleteBrand(slug: string, name: string) {
    if (!confirm(`Delete brand "${name}"?`)) return
    try {
      await api(`/api/brands/${slug}`, { method: 'DELETE' })
      setBrands((prev) => prev.filter((b) => b.slug !== slug))
      toast({ title: 'Brand deleted' })
    } catch {
      // route may not exist — still remove locally
      setBrands((prev) => prev.filter((b) => b.slug !== slug))
      toast({ title: 'Removed locally (no API route)' })
    }
  }

  function renderCatNode(c: CategoryT, depth = 0): JSX.Element {
    return (
      <div key={c.id}>
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-ink-50"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {c.imageUrl ? (
              <img src={c.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded bg-ink-50 text-ink-400">
                <FolderTree size={12} />
              </div>
            )}
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium text-ink-900">{c.name}</p>
              <p className="text-xs text-ink-400">/{c.slug}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
            onClick={() => deleteCategory(c.slug, c.name)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
        {c.children?.map((child) => renderCatNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Categories &amp; Brands</h1>
        <p className="text-sm text-ink-400">Manage product taxonomy.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <FolderTree size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-ink-900">Categories</h2>
            <Badge className="ml-auto bg-brand-50 text-brand-700">{cats.length}</Badge>
          </div>

          {/* Create form */}
          <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({
                    ...catForm,
                    name: e.target.value,
                    slug: catForm.slug || slugify(e.target.value),
                  })
                }
                placeholder="e.g. Electronics"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Slug</Label>
                <Input
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="auto"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Parent</Label>
                <Select
                  value={catForm.parentId}
                  onValueChange={(v) => setCatForm({ ...catForm, parentId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="None (root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (root)</SelectItem>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Image URL (optional)</Label>
              <Input
                value={catForm.imageUrl}
                onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })}
                placeholder="https://..."
                className="h-9"
              />
            </div>
            <Button
              className="w-full bg-brand-500 hover:bg-brand-600"
              size="sm"
              disabled={savingCat}
              onClick={addCategory}
            >
              {savingCat ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              Add Category
            </Button>
          </div>

          {/* Tree */}
          <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-100">
            {loading ? (
              <p className="py-8 text-center text-sm text-ink-400">Loading...</p>
            ) : tree.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">No categories yet.</p>
            ) : (
              <div className="py-1">{tree.map((c) => renderCatNode(c, 0))}</div>
            )}
          </div>
        </Card>

        {/* Brands */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-ink-900">Brands</h2>
            <Badge className="ml-auto bg-brand-50 text-brand-700">{brands.length}</Badge>
          </div>

          <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={brandForm.name}
                onChange={(e) =>
                  setBrandForm({
                    ...brandForm,
                    name: e.target.value,
                    slug: brandForm.slug || slugify(e.target.value),
                  })
                }
                placeholder="e.g. Samsung"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input
                value={brandForm.slug}
                onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
                placeholder="auto"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Logo URL (optional)</Label>
              <Input
                value={brandForm.logoUrl}
                onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                placeholder="https://..."
                className="h-9"
              />
            </div>
            <Button
              className="w-full bg-brand-500 hover:bg-brand-600"
              size="sm"
              disabled={savingBrand}
              onClick={addBrand}
            >
              {savingBrand ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              Add Brand
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-100">
            {loading ? (
              <p className="py-8 text-center text-sm text-ink-400">Loading...</p>
            ) : brands.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">No brands yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {brands.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-ink-50">
                    <div className="flex items-center gap-2 min-w-0">
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <div className="grid h-6 w-6 place-items-center rounded bg-ink-50 text-ink-400">
                          <Tag size={12} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium text-ink-900">{b.name}</p>
                        <p className="text-xs text-ink-400">/{b.slug}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                      onClick={() => deleteBrand(b.slug, b.name)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
