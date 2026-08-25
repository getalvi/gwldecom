'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  ArrowRight,
  Star,
  Download,
  Boxes,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LowStockList } from '@/components/admin/LowStockList'
import { api, formatBDT } from '@/lib/api'
import { navigate } from '@/lib/router'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

export function DashboardView() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    customers: 0,
    pendingOrders: 0,
    lowStock: 0,
    avgOrderValue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [comparison, setComparison] = useState<{ revenuePct: number; orderPct: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api<{ total: number }>('/api/products?limit=1&status=all'),
      api<any[]>('/api/orders'),
      api<any[]>('/api/users'),
      api<{ items: any[]; threshold: number }>('/api/products/low-stock?threshold=10'),
      api<{ changes: { revenuePct: number; orderPct: number } }>('/api/dashboard/stats?days=14').catch(() => null),
    ])
      .then(([p, orders, users, lowStock, dashStats]) => {
        const revenue = orders.reduce((s, o) => s + o.total, 0)
        const pending = orders.filter((o) => o.status === 'pending').length
        const aov = orders.length > 0 ? revenue / orders.length : 0
        setStats({
          products: p.total,
          orders: orders.length,
          revenue,
          customers: users.length,
          pendingOrders: pending,
          lowStock: lowStock.items.length,
          avgOrderValue: aov,
        })
        setRecentOrders(orders.slice(0, 5))
        setAllOrders(orders)
        setLowStockItems(lowStock.items)
        if (dashStats) setComparison(dashStats.changes)

        // top products by units sold
        const productSales = new Map<string, { title: string; qty: number; revenue: number; slug?: string }>()
        for (const o of orders) {
          for (const it of o.items || []) {
            const key = it.productId
            const prev = productSales.get(key) || { title: it.product?.title || 'Product', qty: 0, revenue: 0, slug: it.product?.slug }
            prev.qty += it.quantity
            prev.revenue += it.unitPrice * it.quantity
            productSales.set(key, prev)
          }
        }
        setTopProducts(
          Array.from(productSales.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const [range, setRange] = useState<7 | 14 | 30>(14)

  // Build revenue-over-time (selected range) + order-status distribution.
  const { revenueSeries, statusDist } = useMemo(() => {
    // revenue by day for last `range` days
    const days: { label: string; revenue: number; orders: number }[] = []
    const today = new Date()
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      const dayOrders = allOrders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === key)
      days.push({
        label,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      })
    }
    const dist: { name: string; value: number; color: string }[] = []
    for (const s of ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']) {
      const count = allOrders.filter((o) => o.status === s).length
      if (count > 0) dist.push({ name: s, value: count, color: STATUS_COLORS[s] })
    }
    return { revenueSeries: days, statusDist: dist }
  }, [allOrders, range])

  const cards = [
    {
      label: 'Total Revenue',
      value: formatBDT(stats.revenue),
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
      sub: `AOV ${formatBDT(stats.avgOrderValue)}`,
      change: comparison?.revenuePct,
    },
    {
      label: 'Orders',
      value: stats.orders,
      icon: ShoppingCart,
      color: 'text-brand-600 bg-brand-50',
      sub: `${stats.pendingOrders} pending`,
      change: comparison?.orderPct,
    },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-blue-600 bg-blue-50', sub: 'in catalog' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-purple-600 bg-purple-50', sub: 'registered' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Dashboard</h1>
        <p className="text-sm text-ink-400">Welcome back! Here’s your store overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{c.label}</p>
                <p className="mt-1 truncate text-2xl font-bold text-ink-900">{loading ? '—' : c.value}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p className="text-[11px] text-ink-400">{c.sub}</p>
                  {typeof c.change === 'number' && !loading ? (
                    <span
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        c.change >= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                      title="vs previous 14 days"
                    >
                      {c.change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {c.change >= 0 ? '+' : ''}{c.change}%
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${c.color}`}>
                <c.icon size={22} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {stats.pendingOrders > 0 ? (
          <Card className="flex items-center gap-3 border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="text-amber-600" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {stats.pendingOrders} order(s) awaiting confirmation
              </p>
              <p className="text-xs text-amber-700">Review and confirm pending orders.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/orders')}>
              Review <ArrowRight size={14} className="ml-1" />
            </Button>
          </Card>
        ) : (
          <Card className="flex items-center gap-3 border-emerald-200 bg-emerald-50 p-4">
            <Boxes className="text-emerald-600" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">All orders processed</p>
              <p className="text-xs text-emerald-700">No pending orders.</p>
            </div>
          </Card>
        )}

        {/* Low-stock inline editor */}
        <LowStockList items={lowStockItems} threshold={10} />
      </div>

      {/* Export bar */}
      <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
        <p className="text-xs text-ink-500">
          Export all {stats.orders} order(s) to CSV for accounting.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { window.open('/api/orders/export', '_blank') }}
        >
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue trend — spans 2 cols */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Revenue (last {range} days)</h2>
              <p className="text-xs text-ink-400">Daily order revenue</p>
            </div>
            <div className="flex items-center gap-2">
              {/* range selector */}
              <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 p-0.5">
                {([7, 14, 30] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      range === r
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <TrendingUp size={12} /> {formatBDT(revenueSeries.reduce((s, d) => s + d.revenue, 0))}
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {loading ? (
              <div className="grid h-full place-items-center text-xs text-ink-400">Loading chart…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f75f1a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f75f1a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebeef2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#687790' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#687790' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #ebeef2', fontSize: 12 }}
                    formatter={(v: number) => [formatBDT(v), 'Revenue']}
                    labelStyle={{ color: '#1f232b', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f75f1a" strokeWidth={2.5} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Order status donut */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-900">Order Status</h2>
          <p className="mb-3 text-xs text-ink-400">Distribution by status</p>
          <div className="h-56 w-full">
            {loading ? (
              <div className="grid h-full place-items-center text-xs text-ink-400">Loading…</div>
            ) : statusDist.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-ink-400">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {statusDist.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ebeef2', fontSize: 12 }} formatter={(v: number, n: string) => [`${v} order(s)`, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent orders + Top products */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Recent Orders</h2>
            <Button variant="link" size="sm" className="text-brand-600" onClick={() => navigate('/admin/orders')}>
              View all
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">#{o.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="capitalize bg-ink-50 text-ink-600">{o.status}</Badge>
                    <span className="text-sm font-bold text-brand-600">{formatBDT(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Top Products</h2>
            <span className="text-xs text-ink-400">by units sold</span>
          </div>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No sales yet.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <Link
                  key={i}
                  href={p.slug ? `#/product/${p.slug}` : '#'}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 transition hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-ink-900">{p.title}</p>
                    <p className="text-xs text-ink-400">{p.qty} sold · {formatBDT(p.revenue)}</p>
                  </div>
                  <ArrowRight size={14} className="text-ink-300" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction
          icon={Package}
          title="Add Product"
          desc="Create a new product listing"
          onClick={() => navigate('/admin/products/new')}
        />
        <QuickAction
          icon={TrendingUp}
          title="Manage Banners"
          desc="Update homepage carousel"
          onClick={() => navigate('/admin/banners')}
        />
        <QuickAction
          icon={Clock}
          title="View Orders"
          desc="Process pending orders"
          onClick={() => navigate('/admin/orders')}
        />
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <Card className="flex cursor-pointer items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-sm" onClick={onClick}>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-400">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-ink-300" />
    </Card>
  )
}
