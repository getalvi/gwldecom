'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Package,
  ArrowRight,
  Truck,
  Home,
  Clock,
  XCircle,
  CreditCard,
  MapPin,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'
import type { OrderT } from '@/lib/types'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, desc: 'We received your order' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, desc: 'Seller confirmed the order' },
  { key: 'shipped', label: 'Shipped', icon: Truck, desc: 'On the way to you' },
  { key: 'delivered', label: 'Delivered', icon: Home, desc: 'Order delivered' },
] as const

function statusIndex(status: string): number {
  if (status === 'cancelled') return -1
  const i = STATUS_STEPS.findIndex((s) => s.key === status)
  return i === -1 ? 0 : i
}

export function OrderSuccessView({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderT | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<OrderT>(`/api/orders/${id}`)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-ink-400">Loading...</div>
  }

  const cancelled = order?.status === 'cancelled'
  const currentStep = order ? statusIndex(order.status) : 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center sm:p-8">
        <div
          className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full ${
            cancelled ? 'bg-red-50' : 'bg-emerald-50'
          }`}
        >
          {cancelled ? (
            <XCircle size={36} className="text-red-600" />
          ) : (
            <CheckCircle2 size={36} className="text-emerald-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-ink-900">
          {cancelled ? 'Order Cancelled' : 'Order Confirmed!'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {cancelled
            ? 'This order was cancelled.'
            : 'Thank you for your purchase. Track your order below.'}
        </p>
        {order ? (
          <div className="mt-4 inline-block rounded-lg bg-ink-50 px-4 py-2 text-sm">
            Order ID:{' '}
            <span className="font-mono font-semibold text-ink-900">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </div>
        ) : null}
      </div>

      {order ? (
        <div className="mt-4 space-y-4">
          {/* Status timeline */}
          {!cancelled ? (
            <Card className="p-6">
              <h2 className="mb-5 text-sm font-semibold text-ink-900">Order Tracking</h2>
              <div className="relative">
                {/* progress line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-ink-100" />
                <div
                  className="absolute left-[19px] top-2 w-0.5 bg-brand-500 transition-all duration-700"
                  style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
                <div className="space-y-6">
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= currentStep
                    const isCurrent = i === currentStep
                    const StepIcon = step.icon
                    return (
                      <div key={step.key} className="relative flex items-start gap-4">
                        <div
                          className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-all duration-500 ${
                            done
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-ink-200 bg-white text-ink-300'
                          } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}
                        >
                          <StepIcon size={18} />
                        </div>
                        <div className="pt-1">
                          <p
                            className={`text-sm font-semibold ${
                              done ? 'text-ink-900' : 'text-ink-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-ink-400">{step.desc}</p>
                          {isCurrent ? (
                            <Badge className="mt-1 bg-brand-50 text-brand-700 text-[10px]">
                              Current status
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          ) : null}

          {/* Items + totals */}
          <Card className="p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Order Items</h2>
            {order.items && order.items.length ? (
              <div className="space-y-2">
                {order.items.map((it) => (
                  <Link
                    key={it.id}
                    href={it.product?.slug ? `#/product/${it.product.slug}` : '#'}
                    className="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5 transition hover:border-brand-300 hover:bg-brand-50/30"
                  >
                    <div className="h-10 w-10 shrink-0 rounded bg-ink-50" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-ink-900">
                        {it.product?.title || 'Product'}
                      </p>
                      <p className="text-xs text-ink-400">
                        {formatBDT(it.unitPrice)} × {it.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-ink-900">
                      {formatBDT(it.unitPrice * it.quantity)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">No items.</p>
            )}

            <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Payment method</span>
                <span className="font-medium uppercase text-ink-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>Payment status</span>
                <Badge
                  className={
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : order.paymentStatus === 'refunded'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-ink-50 text-ink-600'
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span className="text-brand-600">{formatBDT(order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Shipping address */}
          {order.shippingAddress ? (
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <MapPin size={16} className="text-brand-500" /> Shipping Address
              </h2>
              <div className="text-sm text-ink-600">
                <p className="font-medium text-ink-900">
                  {(order.shippingAddress as any).fullName}
                </p>
                <p>{(order.shippingAddress as any).addressLine1}</p>
                <p>
                  {(order.shippingAddress as any).city}, {(order.shippingAddress as any).district}{' '}
                  {(order.shippingAddress as any).postalCode}
                </p>
                <p className="mt-1">📞 {(order.shippingAddress as any).phone}</p>
              </div>
            </Card>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-ink-400">Order details unavailable.</p>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => navigate('/account/orders')}>
          <Package size={16} className="mr-1" /> View My Orders
        </Button>
        <Button variant="outline" onClick={() => window.open(`/api/orders/${id}/invoice`, '_blank')}>
          <Download size={16} className="mr-1" /> Download Invoice
        </Button>
        <Button className="bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/')}>
          Continue Shopping <ArrowRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}
