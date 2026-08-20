'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, Pencil, Copy, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useNavigationStore } from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  status: string;
  sku: string | null;
  isFeatured: boolean;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  images: Array<{ id: string; url: string; position: number }>;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
};

const PAGE_SIZE = 10;

export default function AdminProducts() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        admin: 'true',
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || data.data || data || []);
      setTotal(data.total || data.length || 0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : data.categories || []))
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Product deleted');
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete product');
    }
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const product = await res.json();
      const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, images: _i, variants: _v, reviews: _r, ...rest } = product;
      const newProduct = {
        ...rest,
        title: `${product.title} (Copy)`,
        status: 'draft',
        images: product.images?.map((img: { url: string; altText?: string; position: number }) => ({ url: img.url, altText: img.altText, position: img.position })),
        variants: product.variants?.map((v: { name: string; sku?: string; price?: number; stockQuantity: number; attributes: string; image?: string }) => ({
          name: v.name, sku: v.sku, price: v.price, stockQuantity: v.stockQuantity, attributes: v.attributes, image: v.image,
        })),
      };
      const createRes = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct) });
      if (createRes.ok) {
        toast.success('Product duplicated');
        fetchProducts();
      }
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Product ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        fetchProducts();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    try {
      const promises = Array.from(selected).map((id) => {
        if (bulkAction === 'delete') return fetch(`/api/products/${id}`, { method: 'DELETE' });
        const status = bulkAction === 'publish' ? 'published' : 'draft';
        return fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      });
      await Promise.all(promises);
      toast.success(`Bulk action completed for ${selected.size} products`);
      setSelected(new Set());
      fetchProducts();
    } catch {
      toast.error('Bulk action failed');
    }
    setBulkAction(null);
  };

  if (loading) return <LoadingState type="table" count={6} />;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_review">Pending</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate('admin/product-new')}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <span className="text-sm font-medium text-emerald-700">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('publish')}>Publish</Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('unpublish')}>Unpublish</Button>
          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setBulkAction('delete')}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Table */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by adding your first product.'}
          actionLabel="Add Product"
          actionView="admin/product-new"
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3 w-10">
                    <Checkbox checked={selected.size === products.length && products.length > 0} onCheckedChange={toggleSelectAll} />
                  </th>
                  <th className="p-3 font-medium text-gray-500">Product</th>
                  <th className="p-3 font-medium text-gray-500 hidden md:table-cell">Category</th>
                  <th className="p-3 font-medium text-gray-500 hidden lg:table-cell">Brand</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Price</th>
                  <th className="p-3 font-medium text-gray-500 text-right hidden sm:table-cell">Stock</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-gray-400" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-48">{product.title}</p>
                          <p className="text-xs text-gray-400 font-mono">{product.sku || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 hidden md:table-cell">{product.category?.name || '-'}</td>
                    <td className="p-3 text-gray-600 hidden lg:table-cell">{product.brand?.name || '-'}</td>
                    <td className="p-3 text-right">
                      <span className="font-medium">{CURRENCY_SYMBOL}{product.price.toLocaleString()}</span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="ml-1.5 text-xs text-gray-400 line-through">{CURRENCY_SYMBOL}{product.compareAtPrice.toLocaleString()}</span>
                      )}
                    </td>
                    <td className={`p-3 text-right hidden sm:table-cell font-medium ${product.stockQuantity <= 5 ? 'text-red-600' : 'text-gray-700'}`}>
                      {product.stockQuantity}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className={STATUS_COLORS[product.status] || ''}>
                        {STATUS_LABELS[product.status] || product.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('admin/product-edit', { id: product.id })}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(product.id, product.status)}>
                            {product.status === 'published' ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {product.status === 'published' ? 'Unpublish' : 'Publish'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(product.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Product"
        description="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        open={!!bulkAction}
        onOpenChange={() => setBulkAction(null)}
        title={`Bulk ${bulkAction === 'delete' ? 'Delete' : bulkAction === 'publish' ? 'Publish' : 'Unpublish'}`}
        description={`Apply this action to ${selected.size} selected products?`}
        onConfirm={handleBulkAction}
        variant={bulkAction === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  );
}
