'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, ArrowRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNavigationStore } from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';

interface OrderItem {
  productName?: string;
  title?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  image?: string;
  productImage?: string;
}

interface OrderData {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  status: string;
  items?: OrderItem[];
  createdAt?: string;
  estimatedDelivery?: string;
  shippingAddress?: string;
}

function readInitialOrder(): OrderData | null {
  try {
    const stored = sessionStorage.getItem('shopnova-last-order');
    if (stored) {
      return JSON.parse(stored) as OrderData;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function OrderSuccessPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [order] = useState<OrderData | null>(readInitialOrder);
  const [animated, setAnimated] = useState(false);

  // Clean up sessionStorage after reading
  useEffect(() => {
    sessionStorage.removeItem('shopnova-last-order');
  }, []);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="transition-all duration-500">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-8">
            Thank you for your order. You can view it in your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('account/orders')}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              View Orders
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate('home')}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderItems = order.items || [];
  const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'Today';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Success Animation */}
      <div
        className={`text-center mb-8 transition-all duration-700 ${
          animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-gray-500">
          Thank you for your purchase. We&apos;ll send you a confirmation email shortly.
        </p>
      </div>

      {/* Order Info Card */}
      <Card
        className={`transition-all duration-700 delay-200 ${
          animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <CardContent className="p-6 space-y-6">
          {/* Order Number & Date */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-lg font-bold text-gray-900 font-mono">{orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-sm font-medium text-gray-900">{orderDate}</p>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          {orderItems.length > 0 && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items
                </p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img
                        src={item.image || item.productImage || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=No'}
                        alt={item.productName || item.title || 'Item'}
                        className="h-10 w-10 rounded-lg object-cover border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.productName || item.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.variantName ? `${item.variantName} • ` : ''}Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 shrink-0">
                        {CURRENCY_SYMBOL}{(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900">Total Paid</span>
            <span className="text-xl font-bold text-emerald-600">
              {CURRENCY_SYMBOL}{order.totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Estimated Delivery */}
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-sm text-emerald-800 font-medium">
              Estimated Delivery: 3-5 Business Days
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              You&apos;ll receive tracking details via email and SMS.
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('account/orders')}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              View All Orders
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate('home')}
            >
              Continue Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
