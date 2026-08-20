'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Ticket, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : data.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setCode(''); setType('percentage'); setValue('');
    setMinOrderAmount(''); setMaxDiscount(''); setMaxUses(''); setPerUserLimit('');
    setStartsAt(''); setExpiresAt(''); setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setCode(coupon.code); setType(coupon.type); setValue(String(coupon.value));
    setMinOrderAmount(coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : '');
    setMaxDiscount(coupon.maxDiscount != null ? String(coupon.maxDiscount) : '');
    setMaxUses(coupon.maxUses != null ? String(coupon.maxUses) : '');
    setPerUserLimit(coupon.perUserLimit != null ? String(coupon.perUserLimit) : '');
    setStartsAt(coupon.startsAt ? coupon.startsAt.slice(0, 16) : '');
    setExpiresAt(coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '');
    setActive(coupon.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim()) { toast.error('Code is required'); return; }
    if (!value || parseFloat(value) <= 0) { toast.error('Value is required'); return; }
    setSaving(true);
    try {
      const payload = {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        perUserLimit: perUserLimit ? parseInt(perUserLimit) : null,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
        active,
      };
      const url = editingId ? `/api/coupons/${editingId}` : '/api/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingId ? 'Coupon updated' : 'Coupon created');
        setDialogOpen(false);
        fetchCoupons();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/coupons/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Coupon deleted');
        fetchCoupons();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete coupon');
    }
    setDeleteId(null);
  };

  const getTypeLabel = (t: string) => {
    if (t === 'percentage') return '%';
    if (t === 'fixed') return CURRENCY_SYMBOL;
    return 'Free Ship';
  };

  const getStatusInfo = (coupon: Coupon) => {
    if (!coupon.active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: 'Used Up', color: 'bg-amber-100 text-amber-800' };
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-800' };
  };

  if (loading) return <LoadingState type="table" count={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{coupons.length} coupons</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons" description="Create your first coupon." actionLabel="Add Coupon" />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3 font-medium text-gray-500">Code</th>
                  <th className="p-3 font-medium text-gray-500">Type</th>
                  <th className="p-3 font-medium text-gray-500">Value</th>
                  <th className="p-3 font-medium text-gray-500 text-right hidden sm:table-cell">Usage</th>
                  <th className="p-3 font-medium text-gray-500 hidden lg:table-cell">Min Order</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 hidden sm:table-cell">Expires</th>
                  <th className="p-3 font-medium text-gray-500 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((coupon) => {
                  const statusInfo = getStatusInfo(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 capitalize">{coupon.type.replace('_', ' ')}</td>
                      <td className="p-3 font-medium">
                        {coupon.type === 'free_shipping' ? 'Free' : `${getTypeLabel(coupon.type)}${coupon.value}`}
                      </td>
                      <td className="p-3 text-right hidden sm:table-cell">
                        <span className="text-gray-700">{coupon.usedCount}</span>
                        {coupon.maxUses && (
                          <span className="text-gray-400"> / {coupon.maxUses}</span>
                        )}
                        {coupon.maxUses && (
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 ml-auto">
                            <div
                              className={`h-full rounded-full ${coupon.usedCount >= coupon.maxUses ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 hidden lg:table-cell">
                        {coupon.minOrderAmount ? `${CURRENCY_SYMBOL}${coupon.minOrderAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={statusInfo.color}>{statusInfo.label}</Badge>
                      </td>
                      <td className="p-3 text-gray-500 text-xs hidden sm:table-cell">
                        {coupon.expiresAt ? format(new Date(coupon.expiresAt), 'MMM dd, yyyy') : 'Never'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(coupon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => setDeleteId(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Coupon' : 'New Coupon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1.5" placeholder="SUMMER20" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Value *</Label>
                <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5" placeholder={type === 'percentage' ? '20' : '500'} />
              </div>
              <div>
                <Label>Max Discount</Label>
                <Input type="number" step="0.01" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className="mt-1.5" placeholder="2000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Order Amount</Label>
                <Input type="number" step="0.01" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Per User Limit</Label>
                <Input type="number" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} className="mt-1.5" />
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
        title="Delete Coupon"
        description="Are you sure you want to delete this coupon?"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
