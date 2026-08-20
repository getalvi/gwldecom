'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Star, ImagePlus, X, Save, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigationStore } from '@/lib/store';
import { toast } from 'sonner';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface ProductImage { id?: string; url: string; altText?: string; position: number; }
interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stockQuantity: string;
  attributes: string; // JSON string
  image: string;
}

const emptyVariant = (): ProductVariant => ({
  name: '', sku: '', price: '', stockQuantity: '', attributes: '{}', image: '',
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function AdminProductForm() {
  const navigate = useNavigationStore((s) => s.navigate);
  const goBack = useNavigationStore((s) => s.goBack);
  const viewParams = useNavigationStore((s) => s.viewParams);
  const isEdit = !!viewParams?.id;
  const productId = viewParams?.id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sku, setSku] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [weight, setWeight] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [status, setStatus] = useState('draft');

  // Specs
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);

  // Images
  const [images, setImages] = useState<Array<{ url: string; altText: string; position: number }>>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ]).then(([cats, brs]) => {
      setCategories(Array.isArray(cats) ? cats : cats.categories || []);
      setBrands(Array.isArray(brs) ? brs : brs.brands || []);
    });

    if (isEdit && productId) {
      fetch(`/api/products/${productId}`)
        .then((r) => r.json())
        .then((p) => {
          setTitle(p.title || '');
          setSlug(p.slug || '');
          setCategoryId(p.categoryId || '');
          setBrandId(p.brandId || '');
          setPrice(String(p.price || ''));
          setCompareAtPrice(String(p.compareAtPrice || ''));
          setCostPrice(String(p.costPrice || ''));
          setSku(p.sku || '');
          setStockQuantity(String(p.stockQuantity || 0));
          setLowStockThreshold(String(p.lowStockThreshold || 5));
          setShortDesc(p.shortDesc || '');
          setDescription(p.description || '');
          setTags(Array.isArray(p.tags) ? p.tags.join(', ') : p.tags || '');
          setIsFeatured(p.isFeatured || false);
          setIsBestSeller(p.isBestSeller || false);
          setIsNewArrival(p.isNewArrival || false);
          setIsTrending(p.isTrending || false);
          setIsDigital(p.isDigital || false);
          setWeight(String(p.weight || ''));
          setVideoUrl(p.videoUrl || '');
          setSeoTitle(p.seoTitle || '');
          setSeoDescription(p.seoDescription || '');
          setSeoKeywords(p.seoKeywords || '');
          setStatus(p.status || 'draft');

          // Parse specs
          try {
            const parsed = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications || {};
            setSpecs(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
          } catch { setSpecs([{ key: '', value: '' }]); }

          setImages((p.images || []).map((img: ProductImage) => ({ url: img.url, altText: img.altText || '', position: img.position })));

          setVariants((p.variants || []).map((v: { name: string; sku?: string; price?: number; stockQuantity: number; attributes: string; image?: string }) => ({
            id: v.name ? 'existing' : undefined,
            name: v.name,
            sku: v.sku || '',
            price: String(v.price || ''),
            stockQuantity: String(v.stockQuantity || 0),
            attributes: typeof v.attributes === 'string' ? v.attributes : JSON.stringify(v.attributes || {}),
            image: v.image || '',
          })));
        })
        .catch(() => toast.error('Failed to load product'))
        .finally(() => setLoading(false));
    }
  }, [isEdit, productId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) setSlug(slugify(val));
  };

  const buildPayload = (publishNow: boolean) => {
    const specsObj: Record<string, string> = {};
    specs.filter((s) => s.key.trim()).forEach((s) => { specsObj[s.key] = s.value; });

    return {
      title,
      slug: slug || slugify(title),
      categoryId: categoryId || null,
      brandId: brandId || null,
      price: parseFloat(price) || 0,
      compareAtPrice: parseFloat(compareAtPrice) || null,
      costPrice: parseFloat(costPrice) || null,
      sku: sku || null,
      stockQuantity: parseInt(stockQuantity) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 5,
      shortDesc: shortDesc || null,
      description: description || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      isFeatured,
      isBestSeller,
      isNewArrival,
      isTrending,
      isDigital,
      weight: parseFloat(weight) || null,
      videoUrl: videoUrl || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      seoKeywords: seoKeywords || null,
      status: publishNow ? 'published' : status,
      specifications: JSON.stringify(specsObj),
      images: images.map((img, idx) => ({ url: img.url, altText: img.altText, position: idx })),
      variants: variants.filter((v) => v.name.trim()).map((v) => ({
        ...v,
        price: parseFloat(v.price) || null,
        stockQuantity: parseInt(v.stockQuantity) || 0,
      })),
    };
  };

  const handleSave = async (publishNow: boolean) => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!price || parseFloat(price) <= 0) { toast.error('Valid price is required'); return; }

    setSaving(true);
    try {
      const payload = buildPayload(publishNow);
      const url = isEdit ? `/api/products/${productId}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(isEdit ? 'Product updated' : 'Product created');
        navigate('admin/products');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save product');
      }
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'New Product'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>
            <Upload className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} className="mt-1.5" placeholder="Product title" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Switch checked={autoSlug} onCheckedChange={setAutoSlug} className="scale-75" />
                  </div>
                  <Input id="slug" value={slug} onChange={(e) => { setAutoSlug(false); setSlug(e.target.value); }} className="mt-1.5" placeholder="product-slug" />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1.5" placeholder="SKU-001" />
                </div>
              </div>
              <div>
                <Label>Short Description</Label>
                <Textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className="mt-1.5" rows={2} placeholder="Brief product description" />
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={6} placeholder="Detailed product description" />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1.5" placeholder="tag1, tag2, tag3" />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="compareAtPrice">Compare-at Price</Label>
                  <Input id="compareAtPrice" type="number" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input id="costPrice" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Enter image URL" className="flex-1" />
                <Button variant="outline" onClick={() => {
                  if (newImageUrl.trim()) {
                    setImages((prev) => [...prev, { url: newImageUrl.trim(), altText: '', position: prev.length }]);
                    setNewImageUrl('');
                  }
                }}><ImagePlus className="h-4 w-4 mr-2" /> Add</Button>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg border overflow-hidden bg-gray-50 aspect-square">
                      <img src={img.url} alt={img.altText} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => {
                          if (idx > 0) {
                            const next = [...images];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setImages(next);
                          }
                        }} disabled={idx === 0}><ArrowLeft className="h-3 w-3" /></Button>
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => {
                          if (idx < images.length - 1) {
                            const next = [...images];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            setImages(next);
                          }
                        }} disabled={idx === images.length - 1}><ArrowLeft className="h-3 w-3 rotate-180" /></Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {idx === 0 && <Badge className="absolute top-1 left-1 text-[10px] px-1.5">Main</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Specifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder="Key" value={spec.key} onChange={(e) => {
                    const next = [...specs]; next[idx] = { ...next[idx], key: e.target.value }; setSpecs(next);
                  }} className="flex-1" />
                  <Input placeholder="Value" value={spec.value} onChange={(e) => {
                    const next = [...specs]; next[idx] = { ...next[idx], value: e.target.value }; setSpecs(next);
                  }} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSpecs((prev) => [...prev, { key: '', value: '' }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Spec
              </Button>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Variants</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setVariants((prev) => [...prev, emptyVariant()])}>
                  <Plus className="h-4 w-4 mr-2" /> Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {variants.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No variants. Click &quot;Add Variant&quot; to create one.</p>
              )}
              {variants.map((v, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Variant {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={v.name} onChange={(e) => {
                        const next = [...variants]; next[idx] = { ...next[idx], name: e.target.value }; setVariants(next);
                      }} className="mt-1" placeholder="e.g. Red / Large" />
                    </div>
                    <div>
                      <Label className="text-xs">SKU</Label>
                      <Input value={v.sku} onChange={(e) => {
                        const next = [...variants]; next[idx] = { ...next[idx], sku: e.target.value }; setVariants(next);
                      }} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Price Override</Label>
                      <Input type="number" step="0.01" value={v.price} onChange={(e) => {
                        const next = [...variants]; next[idx] = { ...next[idx], price: e.target.value }; setVariants(next);
                      }} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Stock</Label>
                      <Input type="number" value={v.stockQuantity} onChange={(e) => {
                        const next = [...variants]; next[idx] = { ...next[idx], stockQuantity: e.target.value }; setVariants(next);
                      }} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Image URL</Label>
                    <Input value={v.image} onChange={(e) => {
                      const next = [...variants]; next[idx] = { ...next[idx], image: e.target.value }; setVariants(next);
                    }} className="mt-1" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Inventory</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Flags */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Product Flags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Featured', checked: isFeatured, onChange: setIsFeatured },
                { label: 'Best Seller', checked: isBestSeller, onChange: setIsBestSeller },
                { label: 'New Arrival', checked: isNewArrival, onChange: setIsNewArrival },
                { label: 'Trending', checked: isTrending, onChange: setIsTrending },
                { label: 'Digital', checked: isDigital, onChange: setIsDigital },
              ].map((flag) => (
                <div key={flag.label} className="flex items-center justify-between">
                  <Label>{flag.label}</Label>
                  <Switch checked={flag.checked} onCheckedChange={flag.onChange} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Video */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Video</CardTitle></CardHeader>
            <CardContent>
              <Label>Video URL</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="mt-1.5" placeholder="YouTube or video URL" />
            </CardContent>
          </Card>

          {/* SEO */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Keywords</Label>
                <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
