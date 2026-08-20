'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Package, MapPin, CreditCard, Truck, Clock,
  CheckCircle2, Circle, Loader2, Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import LoadingState from '@/components/shared/LoadingState';
import { useNavigationStore } from '@/lib/store';
import { ORDER_STATUSES, CURRENCY_SYMBOL } from '@/lib/constants';

// ─── Types ──────────────────────────────────────────────────

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
}

interface OrderItem {
  id: string;
  productName?: string;
  title?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  image?: string;
  productImage?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  shippingAddress?: string;
  items: OrderItem[];
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  couponCode?: string;
  shippingMethod?: string;
}

// ─── Status Timeline Config ──────────────────────────────────

const TIMELINE_ORDER = [
  'pending', 'confirmed', 'processing', 'packed',
  'shipped', 'out_for_delivery', 'delivered',
];

const TIMELINE_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refund_requested: 'Refund Requested',
  refunded: 'Refunded',
};

// ─── Component ──────────────────────────────────────────────

export default function OrderDetailPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const viewParams = useNavigationStore((s) => s.viewParams);
  const orderId = viewParams.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetch(`/api/orders/${orderId}`)
      .then(r => {
        if (!r.ok) throw new Error('Order not found');
        return r.json();
      })
      .then(data => {
        if (!cancelled) setOrder(data.order || data);
      })
      .catch(e => {
        if (!cancelled) setError(e.message || 'Failed to load order');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState type="detail" count={1} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">We couldn&apos;t find the order you&apos;re looking for.</p>
        <button
          onClick={() => navigate('account/orders')}
          className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
        >
          &larr; Back to Orders
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const found = ORDER_STATUSES.find(s => s.value === status);
    if (found) return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${found.color}`}>{found.label}</span>;
    return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>;
  };

  const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'N/A';

  const isCancelled = order.status === 'cancelled';
  const isReturned = order.status === 'returned' || order.status === 'refunded';
  const isTerminal = isCancelled || isReturned;

  // Build timeline
  let statusHistory = order.statusHistory || [];

  // If no status history, create a minimal one from current status
  if (statusHistory.length === 0) {
    statusHistory = [{ status: order.status, timestamp: order.createdAt || new Date().toISOString() }];
  }

  // Map status history entries to timeline data
  const timelineEntries = statusHistory.map((entry) => ({
    status: entry.status,
    label: TIMELINE_LABELS[entry.status] || entry.status,
    timestamp: entry.timestamp,
    note: entry.note,
  }));

  // Determine current step index in the normal flow
  const currentIdx = TIMELINE_ORDER.indexOf(order.status);

  const items = order.items || [];
  const subtotal = order.subtotal || items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  const discount = order.discountAmount || 0;
  const shipping = order.shippingFee || 0;

  // Parse shipping address
  let addressObj: Record<string, string> = {};
  try {
    addressObj = order.shippingAddress ? JSON.parse(order.shippingAddress) : {};
  } catch {
    if (order.shippingAddress) addressObj = { raw: order.shippingAddress };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate('account/orders')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Orders
      </button>

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">Placed on {orderDate}</p>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Timeline + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTerminal ? (
                // For cancelled/returned, just show the events
                <div className="space-y-4">
                  {timelineEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCancelled ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {isCancelled ? (
                            <span className="text-red-500 text-lg">&times;</span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                        <p className="text-xs text-gray-500">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          }) : ''}
                        </p>
                        {entry.note && <p className="text-xs text-gray-400 mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Normal flow timeline
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {TIMELINE_ORDER.map((step, idx) => {
                      const isCompleted = idx <= currentIdx && currentIdx >= 0;
                      const isCurrent = step === order.status;
                      const historyEntry = timelineEntries.find(e => e.status === step);

                      return (
                        <div key={step} className="flex gap-3 relative">
                          <div className="flex flex-col items-center z-10">
                            {isCompleted ? (
                              <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                                <Circle className="h-3 w-3 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 -mt-1">
                            <p className={`text-sm ${isCompleted ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                              {TIMELINE_LABELS[step] || step}
                            </p>
                            {isCurrent && historyEntry?.timestamp && (
                              <p className="text-xs text-emerald-600 mt-0.5">
                                {new Date(historyEntry.timestamp).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            )}
                            {!isCurrent && historyEntry?.timestamp && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(historyEntry.timestamp).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Qty</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Price</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image || item.productImage || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=No'}
                              alt={item.productName || item.title || 'Item'}
                              className="h-12 w-12 rounded-lg object-cover border shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                {item.productName || item.title}
                              </p>
                              {item.variantName && (
                                <p className="text-xs text-gray-500">{item.variantName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-600">
                          {CURRENCY_SYMBOL}{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {CURRENCY_SYMBOL}{(item.totalPrice || item.unitPrice * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span className="font-medium text-emerald-600">-{CURRENCY_SYMBOL}{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    <>{CURRENCY_SYMBOL}{shipping.toLocaleString()}</>
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {CURRENCY_SYMBOL}{order.totalAmount.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {addressObj.raw ? (
                <p className="text-sm text-gray-600">{addressObj.raw}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{addressObj.fullName || '-'}</p>
                  <p className="text-sm text-gray-600">{addressObj.addressLine1 || '-'}</p>
                  <p className="text-sm text-gray-500">
                    {addressObj.city || ''}{addressObj.district ? `, ${addressObj.district}` : ''}
                    {addressObj.postalCode ? ` - ${addressObj.postalCode}` : ''}
                  </p>
                  <p className="text-sm text-gray-500">{addressObj.phone || ''}</p>
                  {addressObj.email && <p className="text-sm text-gray-500">{addressObj.email}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Payment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium text-gray-900 capitalize">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || 'N/A')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900 capitalize">
                  {order.paymentStatus || 'Pending'}
                </span>
              </div>
              {order.transactionId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-600">{order.transactionId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Method */}
          {order.shippingMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Delivery Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-gray-900 capitalize">{order.shippingMethod}</p>
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">Order Notes</p>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
