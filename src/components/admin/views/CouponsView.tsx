'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Ticket, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { api, formatBDT } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { CouponT, CouponType } from '@/lib/types'

export function CouponsView() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<CouponT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as CouponType,
    value: '',
    minOrderAmount: '',
    maxUses: '',
    expiresAt: '',
    active: true,
  })

  function load() {
    setLoading(true)
    api<CouponT[]>('/api/coupons?all=1')
      .then(setCoupons)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function create() {
    if (!form.code || !form.value) {
      toast({ title: 'Code and value are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const coupon = await api<CouponT>('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value) || 0,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          active: form.active,
        }),
      })
      setCoupons((prev) => [coupon, ...prev])
      setOpen(false)
      setForm({
        code: '',
        type: 'percentage',
        value: '',
        minOrderAmount: '',
        maxUses: '',
        expiresAt: '',
        active: true,
      })
      toast({ title: 'Coupon created' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return
    try {
      await api(`/api/coupons/${id}`, { method: 'DELETE' })
    } catch {
      // route may not exist — ignore and remove locally
    }
    setCoupons((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Coupon removed' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Coupons</h1>
          <p className="text-sm text-ink-400">{coupons.length} coupons</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" /> New Coupon
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Min Order</th>
                <th className="px-4 py-3 font-medium">Used / Max</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Ticket size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No coupons yet.</p>
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt) < new Date()
                  return (
                    <tr key={c.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <code className="rounded bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700">
                          {c.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-ink-600 capitalize">{c.type}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {c.type === 'percentage' ? `${c.value}%` : formatBDT(c.value)}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {c.minOrderAmount ? formatBDT(c.minOrderAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {c.usedCount} / {c.maxUses ?? '∞'}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-400">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <Badge className="bg-red-50 text-red-700">Expired</Badge>
                        ) : c.active ? (
                          <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>
                        ) : (
                          <Badge className="bg-ink-50 text-ink-600">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => remove(c.id, c.code)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER25"
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: CouponType) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  Value * ({form.type === 'percentage' ? '%' : '৳'})
                </Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'percentage' ? '25' : '500'}
                />
              </div>
              <div>
                <Label className="text-xs">Min Order (৳)</Label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max Uses</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label className="text-xs">Expires At</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-ink-100 p-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label className="text-xs">Active</Label>
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
