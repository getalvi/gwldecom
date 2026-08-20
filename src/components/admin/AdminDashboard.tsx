'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign, ShoppingCart, Users, Package, Clock, AlertTriangle, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ORDER_STATUSES, CURRENCY_SYMBOL } from '@/lib/constants';
import LoadingState from '@/components/shared/LoadingState';
import { format } from 'date-fns';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
 recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    customer: { id: string; name: string | null; email: string } | null;
  }>;
  topProducts: Array<{
    productId: string;
    product: { id: string; title: string; images: Array<{ url: string }> } | null;
    _sum: { quantity: number; total: number };
  }>;
  ordersByStatus: Array<{ status: string; _count: number; _sum: { total: number } }>;
  revenueByDay: Array<{ date: string; total: number }>;
}

const PIE_COLORS = ['#facc15', '#3b82f6', '#6366f1', '#a855f7', '#06b6d4', '#f97316', '#22c55e', '#ef4444', '#6b7280', '#f59e0b', '#14b8a6'];

const statCards = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'totalCustomers', label: 'Total Customers', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'totalProducts', label: 'Total Products', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard');
        return r.json();
      })
      .then((data) => setStats(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState type="dashboard" />;
  if (error) return <p className="text-red-500 text-center py-12">{error}</p>;
  if (!stats) return null;

  const pendingOrders = stats.ordersByStatus.find((s) => s.status === 'pending')?._count || 0;
  const lowStockCount = 0; // Would need separate API

  const pieData = stats.ordersByStatus.map((s) => {
    const statusInfo = ORDER_STATUSES.find((os) => os.value === s.status);
    return {
      name: statusInfo?.label || s.status,
      value: s._count,
    };
  }).filter((d) => d.value > 0);

  const chartData = stats.revenueByDay.map((d) => ({
    date: format(new Date(d.date), 'MMM dd'),
    revenue: d.total,
  }));

  const getStatusColor = (status: string) => {
    const s = ORDER_STATUSES.find((os) => os.value === status);
    return s?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const s = ORDER_STATUSES.find((os) => os.value === status);
    return s?.label || status;
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof DashboardStats] as number;
          return (
            <Card key={card.key} className="rounded-xl">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.key === 'totalRevenue'
                        ? `${CURRENCY_SYMBOL}${value.toLocaleString()}`
                        : value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {/* Extra stat cards */}
        <Card className="rounded-xl">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{pendingOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{lowStockCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-16">No revenue data</p>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-16">No order data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-2.5 font-mono text-xs">#{order.orderNumber.slice(-8)}</td>
                      <td className="py-2.5 text-gray-700">{order.customer?.name || order.customer?.email || 'Guest'}</td>
                      <td className="py-2.5 text-right font-medium">{CURRENCY_SYMBOL}{order.total.toLocaleString()}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium text-right">Sold</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.topProducts.slice(0, 5).map((p) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="py-2.5 text-gray-700 max-w-48 truncate">
                        {p.product?.title || 'Unknown'}
                      </td>
                      <td className="py-2.5 text-right font-medium">{p._sum.quantity}</td>
                      <td className="py-2.5 text-right font-medium">{CURRENCY_SYMBOL}{(p._sum.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
