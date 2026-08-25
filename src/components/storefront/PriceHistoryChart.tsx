'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { api, formatBDT } from '@/lib/api'

type PricePoint = { date: string; price: number; compareAtPrice: number | null }

export function PriceHistoryChart({ slug }: { slug: string }) {
  const [data, setData] = useState<PricePoint[]>([])
  const [current, setCurrent] = useState<{ price: number; compareAtPrice: number | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api<{ items: PricePoint[]; current: { price: number; compareAtPrice: number | null } }>(
      `/api/products/${slug}/price-history`
    )
      .then((r) => {
        setData(r.items)
        setCurrent(r.current)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-ink-400">
        <Loader2 size={14} className="animate-spin" /> Loading price history...
      </div>
    )
  }

  if (data.length < 2) return null // don't show a chart with only 1 point

  // trend: compare first vs last
  const first = data[0]?.price
  const last = data[data.length - 1]?.price
  const trend = first && last ? ((last - first) / first) * 100 : 0

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
          <TrendingUp size={13} className="text-brand-500" /> Price History
        </h4>
        <span
          className={`text-[11px] font-semibold ${
            trend >= 0 ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebeef2" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#687790' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#687790' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              domain={['dataMin - 100', 'dataMax + 100']}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #ebeef2', fontSize: 11 }}
              formatter={(v: number) => [formatBDT(v), 'Price']}
              labelStyle={{ color: '#1f232b', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#f75f1a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {current ? (
        <p className="mt-1 text-[10px] text-ink-400">
          Current: <span className="font-semibold text-brand-600">{formatBDT(current.price)}</span>
          {current.compareAtPrice && current.compareAtPrice > current.price ? (
            <> · was <span className="line-through">{formatBDT(current.compareAtPrice)}</span></>
          ) : null}
        </p>
      ) : null}
    </Card>
  )
}
