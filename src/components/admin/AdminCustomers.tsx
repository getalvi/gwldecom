'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Users, Shield, ShieldOff, MoreHorizontal, Mail, Phone, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Customer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  suspended: boolean;
  createdAt: string;
  _count?: { orders: number };
  _sum?: { total: number };
}

interface CustomerDetail extends Customer {
  addresses: Array<{
    id: string; label: string; fullName: string; phone: string;
    addressLine1: string; city: string; district: string; postalCode?: string; isDefault: boolean;
  }>;
  orders: Array<{
    id: string; orderNumber: string; total: number; status: string; createdAt: string;
  }>;
  reviews: Array<{ id: string; rating: number; title: string | null; body: string | null; createdAt: string }>;
}

const PAGE_SIZE = 10;

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setCustomers(data.users || data.data || data || []);
      setTotal(data.total || data.length || 0);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleToggleSuspend = async (userId: string, suspended: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !suspended }),
      });
      if (res.ok) {
        toast.success(suspended ? 'User unsuspended' : 'User suspended');
        fetchCustomers();
        if (detailCustomer?.id === userId) setDetailCustomer(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users?limit=1&search=`);
      // Fetch orders and addresses separately for the user
      const [ordersRes, addressesRes] = await Promise.all([
        fetch(`/api/orders?customerId=${userId}&limit=20`).then((r) => r.json()).catch(() => []),
        fetch(`/api/addresses?userId=${userId}`).then((r) => r.json()).catch(() => []),
      ]);
      const user = customers.find((c) => c.id === userId);
      if (!user) return;
      setDetailCustomer({
        ...user,
        addresses: Array.isArray(addressesRes) ? addressesRes : [],
        orders: (Array.isArray(ordersRes) ? ordersRes : ordersRes.orders || []).slice(0, 20),
        reviews: [],
      });
    } catch {
      toast.error('Failed to load customer details');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <LoadingState type="table" count={6} />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="No customers match your filters." />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3 font-medium text-gray-500">Customer</th>
                  <th className="p-3 font-medium text-gray-500 hidden md:table-cell">Role</th>
                  <th className="p-3 font-medium text-gray-500 text-right hidden sm:table-cell">Orders</th>
                  <th className="p-3 font-medium text-gray-500 text-right hidden lg:table-cell">Spent</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 hidden sm:table-cell">Joined</th>
                  <th className="p-3 font-medium text-gray-500 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                            {customer.name?.charAt(0)?.toUpperCase() || customer.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-40">{customer.name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500 truncate max-w-40">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="secondary" className={customer.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                        {customer.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium hidden sm:table-cell">{customer._count?.orders || 0}</td>
                    <td className="p-3 text-right font-medium hidden lg:table-cell">{CURRENCY_SYMBOL}{(customer._sum?.total || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className={customer.suspended ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                        {customer.suspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-500 text-xs hidden sm:table-cell">{format(new Date(customer.createdAt), 'MMM dd, yyyy')}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(customer.id)} className="text-xs">View</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs ${customer.suspended ? 'text-emerald-600' : 'text-red-600'}`}
                          onClick={() => handleToggleSuspend(customer.id, customer.suspended)}
                        >
                          {customer.suspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={() => setDetailCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : detailCustomer ? (
            <div className="space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                    {detailCustomer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">{detailCustomer.name || 'Unnamed'}</h3>
                  <p className="text-sm text-gray-500">{detailCustomer.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className={detailCustomer.suspended ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                      {detailCustomer.suspended ? 'Suspended' : 'Active'}
                    </Badge>
                    <Badge variant="secondary">{detailCustomer.role}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" /> <span>{detailCustomer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" /> <span>{detailCustomer.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{detailCustomer._count?.orders || 0}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{CURRENCY_SYMBOL}{(detailCustomer._sum?.total || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{format(new Date(detailCustomer.createdAt), 'MMM yy')}</p>
                  <p className="text-xs text-gray-500">Joined</p>
                </div>
              </div>

              {/* Addresses */}
              {detailCustomer.addresses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Addresses ({detailCustomer.addresses.length})</h4>
                  <div className="space-y-2">
                    {detailCustomer.addresses.map((addr) => (
                      <div key={addr.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">{addr.label}</span>
                          {addr.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5">Default</Badge>}
                        </div>
                        <p className="text-gray-600">{addr.fullName}, {addr.addressLine1}</p>
                        <p className="text-gray-600">{addr.city}, {addr.district} {addr.postalCode || ''}</p>
                        <p className="text-gray-500">{addr.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History */}
              {detailCustomer.orders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Orders</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailCustomer.orders.slice(0, 10).map((order) => (
                      <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                        <div>
                          <span className="font-mono text-xs">#{order.orderNumber.slice(-8)}</span>
                          <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{CURRENCY_SYMBOL}{order.total.toLocaleString()}</p>
                          <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className={`w-full ${detailCustomer.suspended ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-600 hover:text-red-700'}`}
                onClick={() => handleToggleSuspend(detailCustomer.id, detailCustomer.suspended)}
              >
                {detailCustomer.suspended ? <><ShieldOff className="h-4 w-4 mr-2" /> Unsuspend Customer</> : <><Shield className="h-4 w-4 mr-2" /> Suspend Customer</>}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
