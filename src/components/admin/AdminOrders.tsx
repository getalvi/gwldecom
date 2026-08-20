'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, X, Package, ChevronDown, ChevronUp, Truck, FileText, Ban, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { ORDER_STATUSES, CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shippingAddress: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string | null; email: string; phone: string | null } | null;
  items: OrderItem[];
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    trackingNumber: string | null;
    createdAt: string;
  }>;
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  unpaid: 'bg-gray-100 text-gray-800',
  refunded: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

const PAGE_SIZE = 10;

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || data.data || data || []);
      setTotal(data.total || data.length || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getStatusColor = (status: string) => ORDER_STATUSES.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status: string) => ORDER_STATUSES.find((s) => s.value === status)?.label || status;

  const handleUpdateStatus = async () => {
    if (!detailOrder || !updateStatus) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${detailOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updateStatus, note: note || undefined, trackingNumber: trackingNumber || undefined }),
      });
      if (res.ok) {
        toast.success('Order updated');
        setDetailOrder(null);
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailOrder(data);
        setUpdateStatus(data.status);
      }
    } catch {
      setDetailOrder(order);
      setUpdateStatus(order.status);
    }
  };

  const parseAddress = (addr: string) => {
    try { return JSON.parse(addr); } catch { return null; }
  };

  if (loading) return <LoadingState type="table" count={6} />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders found" description="No orders match your current filters." />
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3 font-medium text-gray-500">Order</th>
                  <th className="p-3 font-medium text-gray-500 hidden sm:table-cell">Customer</th>
                  <th className="p-3 font-medium text-gray-500 text-right hidden md:table-cell">Items</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Total</th>
                  <th className="p-3 font-medium text-gray-500 hidden lg:table-cell">Payment</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 hidden sm:table-cell">Date</th>
                  <th className="p-3 font-medium text-gray-500 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openDetail(order)}>
                      <td className="p-3">
                        <span className="font-mono text-xs">#{order.orderNumber.slice(-8)}</span>
                      </td>
                      <td className="p-3 text-gray-700 hidden sm:table-cell">
                        <div>
                          <p className="font-medium">{order.customer?.name || 'Guest'}</p>
                          <p className="text-xs text-gray-400">{order.customer?.email}</p>
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-600 hidden md:table-cell">{order.items?.length || 0}</td>
                      <td className="p-3 text-right font-medium">{CURRENCY_SYMBOL}{order.total.toLocaleString()}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <Badge variant="secondary" className={PAYMENT_STATUS_COLORS[order.paymentStatus] || ''}>
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-500 text-xs hidden sm:table-cell">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === order.id ? null : order.id); }}>
                          {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                    {/* Inline Expanded */}
                    {expandedId === order.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 p-4">
                          <div className="grid sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">Customer</p>
                              <p className="text-gray-500">{order.customer?.name || 'Guest'} &middot; {order.customer?.email}</p>
                              <p className="text-gray-500">{order.customer?.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Shipping Address</p>
                              {(() => {
                                const addr = parseAddress(order.shippingAddress);
                                return addr ? (
                                  <p className="text-gray-500">{addr.fullName}, {addr.addressLine1}, {addr.city}, {addr.district} {addr.postalCode || ''}</p>
                                ) : <p className="text-gray-500">N/A</p>;
                              })()}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => openDetail(order)}>
                            <FileText className="h-4 w-4 mr-2" /> View Full Details
                          </Button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{detailOrder?.orderNumber?.slice(-8)}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-6">
              {/* Status Update */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Update Order</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={updateStatus} onValueChange={setUpdateStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tracking Number</Label>
                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="mt-1" placeholder="Tracking ID" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" rows={2} />
                </div>
                <Button onClick={handleUpdateStatus} disabled={updating || !updateStatus}>
                  <Truck className="h-4 w-4 mr-2" /> {updating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Customer</h4>
                  <p className="font-medium">{detailOrder.customer?.name || 'Guest'}</p>
                  <p className="text-sm text-gray-500">{detailOrder.customer?.email}</p>
                  <p className="text-sm text-gray-500">{detailOrder.customer?.phone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Shipping Address</h4>
                  {(() => {
                    const addr = parseAddress(detailOrder.shippingAddress);
                    return addr ? (
                      <div className="text-sm text-gray-700">
                        <p>{addr.fullName}</p>
                        <p>{addr.addressLine1}</p>
                        <p>{addr.city}, {addr.district} {addr.postalCode || ''}</p>
                        <p>{addr.phone}</p>
                      </div>
                    ) : <p className="text-sm text-gray-400">N/A</p>;
                  })()}
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Items ({detailOrder.items?.length || 0})</h4>
                <div className="space-y-2">
                  {detailOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      {item.productImage && (
                        <img src={item.productImage} alt={item.productName} className="h-12 w-12 rounded-lg object-cover bg-white" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.productName}</p>
                        {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{CURRENCY_SYMBOL}{item.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{CURRENCY_SYMBOL}{item.unitPrice} x {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{CURRENCY_SYMBOL}{detailOrder.subtotal.toLocaleString()}</span></div>
                {detailOrder.discount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="text-red-600">-{CURRENCY_SYMBOL}{detailOrder.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span>{CURRENCY_SYMBOL}{detailOrder.shippingFee.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold"><span>Total</span><span>{CURRENCY_SYMBOL}{detailOrder.total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><span>{detailOrder.paymentMethod.toUpperCase()} · <span className={detailOrder.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-gray-500'}>{detailOrder.paymentStatus}</span></span></div>
              </div>

              {/* Status History */}
              {detailOrder.statusHistory?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Status History</h4>
                  <div className="space-y-3 relative">
                    <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-200" />
                    {detailOrder.statusHistory.slice().reverse().map((entry) => (
                      <div key={entry.id} className="flex gap-3 relative">
                        <div className="h-6 w-6 rounded-full bg-white border-2 border-emerald-500 z-10 shrink-0 mt-0.5" />
                        <div>
                          <Badge variant="secondary" className={getStatusColor(entry.status)}>{getStatusLabel(entry.status)}</Badge>
                          <p className="text-xs text-gray-500 mt-1">{format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                          {entry.trackingNumber && <p className="text-xs text-gray-500">Tracking: {entry.trackingNumber}</p>}
                          {entry.note && <p className="text-xs text-gray-500">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
