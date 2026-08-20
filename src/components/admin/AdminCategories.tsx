'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderTree, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  position: number;
  active: boolean;
  _count: { products: number };
  children?: Category[];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [parentId, setParentId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [position, setPosition] = useState('0');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      const cats = Array.isArray(data) ? data : data.categories || [];
      setCategories(cats);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setAutoSlug(true);
    setParentId('');
    setImageUrl('');
    setPosition('0');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setAutoSlug(false);
    setParentId(cat.parentId || '');
    setImageUrl(cat.image || '');
    setPosition(String(cat.position));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || slugify(name),
        parentId: parentId || null,
        image: imageUrl || null,
        position: parseInt(position) || 0,
      };
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingId ? 'Category updated' : 'Category created');
        setDialogOpen(false);
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/categories/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete category');
    }
    setDeleteId(null);
  };

  // Build flat list with hierarchy indentation
  const buildFlatList = (cats: Category[], depth: number = 0): Array<Category & { _depth: number }> => {
    const result: Array<Category & { _depth: number }> = [];
    const sorted = [...cats].sort((a, b) => a.position - b.position);
    for (const cat of sorted) {
      result.push({ ...cat, _depth: depth });
      if (cat.children && cat.children.length > 0) {
        result.push(...buildFlatList(cat.children, depth + 1));
      }
    }
    return result;
  };

  const flatList = buildFlatList(categories);

  // Parent categories for select
  const parentOptions = flatList.filter((c) => c.id !== editingId);

  if (loading) return <LoadingState type="list" count={5} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{flatList.length} categories</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {flatList.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories" description="Create your first category to organize products." actionLabel="Add Category" />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="divide-y">
            {flatList.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                <div style={{ paddingLeft: `${cat._depth * 24}px` }} className="flex items-center gap-3 flex-1 min-w-0">
                  {cat._depth > 0 && <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />}
                  <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><FolderTree className="h-4 w-4 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{cat.slug}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 shrink-0 hidden sm:block">{cat._count.products} products</div>
                <div className="text-sm text-gray-400 shrink-0 hidden md:block">{cat.parent?.name || '—'}</div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600"
                    onClick={() => setDeleteId(cat.id)}
                    disabled={cat._count.products > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (autoSlug) setSlug(slugify(e.target.value)); }} className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label>Slug</Label>
                <input type="checkbox" checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} className="scale-75" />
              </div>
              <Input value={slug} onChange={(e) => { setAutoSlug(false); setSlug(e.target.value); }} className="mt-1.5" />
            </div>
            <div>
              <Label>Parent Category</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{'  '.repeat(c._depth)}{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
            </div>
            <div>
              <Label>Position</Label>
              <Input type="number" value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Category"
        description="Are you sure? Categories with products cannot be deleted."
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
