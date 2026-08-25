'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { OrderT, OrderStatus, PaymentStatus } from '@/lib/types'

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]
const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'refunded']

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-50 text-red-700',
  paid: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-ink-50 text-ink-600',
}

interface OrderRow extends OrderT {
  customer?: { id: string; email: string; fullName: string | null } | null
}

export function OrdersView() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')

  useEffect(() => {
    api<OrderRow[]>('/api/orders')
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  async function patchOrder(id: string, patch: { status?: OrderStatus; paymentStatus?: PaymentStatus }) {
    try {
      await api(`/api/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      )
      toast({ title: 'Order updated' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Orders</h1>
          <p className="text-sm text-ink-400">{filtered.length} orders</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | OrderStatus)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ShoppingCart size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No orders found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs font-semibold text-ink-900">
                        #{o.id.slice(-8).toUpperCase()}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {o.customer?.email || (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {o.items?.length || 0}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {formatBDT(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={o.status}
                        onValueChange={(v) => patchOrder(o.id, { status: v as OrderStatus })}
                      >
                        <SelectTrigger className="h-8 w-32 border-0 bg-transparent p-0 hover:bg-ink-100">
                          <Badge className={STATUS_COLORS[o.status]}>{o.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={o.paymentStatus}
                        onValueChange={(v) => patchOrder(o.id, { paymentStatus: v as PaymentStatus })}
                      >
                        <SelectTrigger className="h-8 w-28 border-0 bg-transparent p-0 hover:bg-ink-100">
                          <Badge className={PAYMENT_COLORS[o.paymentStatus]}>{o.paymentStatus}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/order/${o.id}`)}
                          title="View order detail"
                        >
                          <Eye size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
