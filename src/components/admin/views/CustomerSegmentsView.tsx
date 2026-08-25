'use client'

import { useEffect, useState } from 'react'
import { Users, Crown, UserCheck, UserPlus, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, formatBDT } from '@/lib/api'

type Segment = { label: string; count: number; revenue: number }
type Customer = { id: string; email: string; fullName: string | null; spend: number; orderCount: number; joinedAt: string }

export function CustomerSegmentsView() {
  const [data, setData] = useState<{
    segments: Segment[]
    topVip: Customer[]
    topRegular: Customer[]
    topNew: Customer[]
    totalCustomers: number
    totalRevenue: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<any>('/api/admin/customer-segments')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-sm text-ink-400">Loading segments...</div>
  if (!data) return <div className="py-12 text-center text-sm text-ink-400">No data.</div>

  const segIcons = [Crown, UserCheck, UserPlus]
  const segColors = ['text-amber-600 bg-amber-50', 'text-brand-600 bg-brand-50', 'text-blue-600 bg-blue-50']

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Customer Segments</h1>
        <p className="text-sm text-ink-400">Segment customers by lifetime spend for targeted outreach.</p>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total Customers</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{data.totalCustomers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatBDT(data.totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Avg Spend</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {data.totalCustomers > 0 ? formatBDT(data.totalRevenue / data.totalCustomers) : formatBDT(0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Segments</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{data.segments.length}</p>
        </Card>
      </div>

      {/* segment cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {data.segments.map((s, i) => {
          const Icon = segIcons[i] || Users
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-lg ${segColors[i]}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{s.label}</p>
                  <p className="text-xs text-ink-400">{s.count} customer(s)</p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-brand-600">{formatBDT(s.revenue)}</p>
              <p className="text-xs text-ink-400">lifetime revenue</p>
            </Card>
          )
        })}
      </div>

      {/* top customers per segment */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: 'Top VIP Customers', customers: data.topVip, color: 'text-amber-600' },
          { title: 'Top Regular Customers', customers: data.topRegular, color: 'text-brand-600' },
        ].map((sec) => (
          <Card key={sec.title} className="p-5">
            <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${sec.color}`}>
              <TrendingUp size={15} /> {sec.title}
            </h2>
            {sec.customers.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-400">No customers in this segment yet.</p>
            ) : (
              <div className="space-y-2">
                {sec.customers.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{c.fullName || c.email}</p>
                      <p className="truncate text-xs text-ink-400">{c.orderCount} order(s) · joined {new Date(c.joinedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-bold text-brand-600">{formatBDT(c.spend)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
