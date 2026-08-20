'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Layout, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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

interface HomepageSection {
  id: string;
  type: string;
  title: string | null;
  config: string;
  position: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const SECTION_TYPES = [
  'hero_banner', 'featured_categories', 'flash_sale', 'featured_products',
  'bestseller_products', 'new_arrival_products', 'trending_products',
  'promo_banner', 'product_grid', 'testimonials', 'custom',
];

const TYPE_LABELS: Record<string, string> = {
  hero_banner: 'Hero Banner',
  featured_categories: 'Featured Categories',
  flash_sale: 'Flash Sale',
  featured_products: 'Featured Products',
  bestseller_products: 'Bestseller Products',
  new_arrival_products: 'New Arrival Products',
  trending_products: 'Trending Products',
  promo_banner: 'Promo Banner',
  product_grid: 'Product Grid',
  testimonials: 'Testimonials',
  custom: 'Custom Section',
};

export default function AdminHomepage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [type, setType] = useState('hero_banner');
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState('{}');
  const [position, setPosition] = useState('0');
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Type-specific fields
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCta, setHeroCta] = useState('');
  const [heroCtaLink, setHeroCtaLink] = useState('');
  const [heroImage, setHeroImage] = useState('');

  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/homepage');
      const data = await res.json();
      const secs = Array.isArray(data) ? data : data.sections || [];
      setSections(secs.sort((a: HomepageSection, b: HomepageSection) => a.position - b.position));
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSections(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setType('hero_banner'); setTitle(''); setConfig('{}');
    setPosition(String(sections.length)); setActive(true);
    setStartsAt(''); setExpiresAt('');
    setHeroTitle(''); setHeroSubtitle(''); setHeroCta(''); setHeroCtaLink(''); setHeroImage('');
    setDialogOpen(true);
  };

  const openEdit = (section: HomepageSection) => {
    setEditingId(section.id);
    setType(section.type); setTitle(section.title || '');
    try { setConfig(JSON.stringify(JSON.parse(section.config), null, 2)); } catch { setConfig(section.config); }
    setPosition(String(section.position)); setActive(section.active);
    setStartsAt(section.startsAt ? section.startsAt.slice(0, 16) : '');
    setExpiresAt(section.expiresAt ? section.expiresAt.slice(0, 16) : '');
    // Parse type-specific fields
    try {
      const parsed = JSON.parse(section.config);
      setHeroTitle(parsed.title || '');
      setHeroSubtitle(parsed.subtitle || '');
      setHeroCta(parsed.cta || '');
      setHeroCtaLink(parsed.ctaLink || '');
      setHeroImage(parsed.image || parsed.imageUrl || '');
    } catch {}
    setDialogOpen(true);
  };

  const buildConfig = () => {
    // Start with JSON editor content
    try {
      JSON.parse(config); // validate
    } catch {
      toast.error('Invalid JSON in config');
      return null;
    }
    return config;
  };

  const handleSave = async () => {
    const finalConfig = buildConfig();
    if (finalConfig === null) return;
    setSaving(true);
    try {
      const payload = {
        type,
        title: title || null,
        config: finalConfig,
        position: parseInt(position) || 0,
        active,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
      };
      const url = editingId ? `/api/homepage/${editingId}` : '/api/homepage';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingId ? 'Section updated' : 'Section created');
        setDialogOpen(false);
        fetchSections();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/homepage/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Section deleted');
        fetchSections();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete section');
    }
    setDeleteId(null);
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    // Swap positions
    const updated = [...sections];
    const tempPos = updated[idx].position;
    updated[idx] = { ...updated[idx], position: updated[swapIdx].position };
    updated[swapIdx] = { ...updated[swapIdx], position: tempPos };

    try {
      await Promise.all([
        fetch(`/api/homepage/${updated[idx].id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: updated[idx].position }),
        }),
        fetch(`/api/homepage/${updated[swapIdx].id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: updated[swapIdx].position }),
        }),
      ]);
      setSections(updated.sort((a, b) => a.position - b.position));
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/homepage/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.ok) fetchSections();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  if (loading) return <LoadingState type="list" count={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sections.length} sections</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <EmptyState icon={Layout} title="No sections" description="Add sections to build your homepage." actionLabel="Add Section" />
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border bg-white p-4 flex items-center gap-4">
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={sections.indexOf(section) === 0} onClick={() => handleMove(section.id, 'up')}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={sections.indexOf(section) === sections.length - 1} onClick={() => handleMove(section.id, 'down')}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">{TYPE_LABELS[section.type] || section.type}</Badge>
                  <span className="font-medium text-gray-900 truncate">{section.title || 'Untitled'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Position: {section.position}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleToggleActive(section.id, section.active)}
              >
                {section.active ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(section)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-400 hover:text-red-600" onClick={() => setDeleteId(section.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Section' : 'New Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position</Label>
                <Input type="number" value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1.5" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={active} onCheckedChange={setActive} />
                <Label>Active</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Starts At</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Expires At</Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            {/* Type-specific fields for hero_banner */}
            {type === 'hero_banner' && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500">Quick Fields for Hero Banner</p>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={heroTitle} onChange={(e) => {
                    setHeroTitle(e.target.value);
                    try {
                      const c = JSON.parse(config); c.title = e.target.value; setConfig(JSON.stringify(c, null, 2));
                    } catch {}
                  }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Subtitle</Label>
                  <Input value={heroSubtitle} onChange={(e) => {
                    setHeroSubtitle(e.target.value);
                    try {
                      const c = JSON.parse(config); c.subtitle = e.target.value; setConfig(JSON.stringify(c, null, 2));
                    } catch {}
                  }} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">CTA Text</Label>
                    <Input value={heroCta} onChange={(e) => {
                      setHeroCta(e.target.value);
                      try {
                        const c = JSON.parse(config); c.cta = e.target.value; setConfig(JSON.stringify(c, null, 2));
                      } catch {}
                    }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">CTA Link</Label>
                    <Input value={heroCtaLink} onChange={(e) => {
                      setHeroCtaLink(e.target.value);
                      try {
                        const c = JSON.parse(config); c.ctaLink = e.target.value; setConfig(JSON.stringify(c, null, 2));
                      } catch {}
                    }} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input value={heroImage} onChange={(e) => {
                    setHeroImage(e.target.value);
                    try {
                      const c = JSON.parse(config); c.image = e.target.value; setConfig(JSON.stringify(c, null, 2));
                    } catch {}
                  }} className="mt-1" />
                </div>
              </div>
            )}

            {/* JSON Config */}
            <div>
              <Label>Configuration (JSON)</Label>
              <Textarea
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                className="mt-1.5 font-mono text-xs"
                rows={8}
                placeholder='{"key": "value"}'
              />
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
        title="Delete Section"
        description="Are you sure you want to delete this homepage section?"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
