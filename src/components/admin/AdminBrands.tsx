'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  active: boolean;
  _count: { products: number };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : data.brands || []);
    } catch {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setAutoSlug(true);
    setLogoUrl('');
    setDialogOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setName(brand.name);
    setSlug(brand.slug);
    setAutoSlug(false);
    setLogoUrl(brand.logo || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || slugify(name),
        logo: logoUrl || null,
      };
      const url = editingId ? `/api/brands/${editingId}` : '/api/brands';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingId ? 'Brand updated' : 'Brand created');
        setDialogOpen(false);
        fetchBrands();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/brands/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Brand deleted');
        fetchBrands();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete brand');
    }
    setDeleteId(null);
  };

  if (loading) return <LoadingState type="table" count={5} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{brands.length} brands</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <EmptyState icon={Tag} title="No brands" description="Create your first brand." actionLabel="Add Brand" />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3 font-medium text-gray-500">Brand</th>
                  <th className="p-3 font-medium text-gray-500 hidden md:table-cell">Slug</th>
                  <th className="p-3 font-medium text-gray-500 hidden lg:table-cell">Logo</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Products</th>
                  <th className="p-3 font-medium text-gray-500 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-900">{brand.name}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs hidden md:table-cell">{brand.slug}</td>
                    <td className="p-3 hidden lg:table-cell">
                      {brand.logo ? (
                        <img src={brand.logo} alt={brand.name} className="h-8 w-16 object-contain rounded bg-gray-50" />
                      ) : (
                        <span className="text-gray-400 text-xs">No logo</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{brand._count.products}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(brand)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => setDeleteId(brand.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Brand' : 'New Brand'}</DialogTitle>
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
              <Label>Logo URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain rounded bg-gray-50 p-2" />
              )}
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
        title="Delete Brand"
        description="Are you sure you want to delete this brand?"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
