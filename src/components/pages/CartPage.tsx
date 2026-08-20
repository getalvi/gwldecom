'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Tag,
  Truck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { useNavigationStore, useCartStore, useCartSubtotal, useCartTotal } from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';

export default function CartPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const couponCode = useCartStore((s) => s.couponCode);
  const discount = useCartStore((s) => s.discount);
  const shippingFee = useCartStore((s) => s.shippingFee);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const setShippingFee = useCartStore((s) => s.setShippingFee);
  const clearCoupon = useCartStore((s) => s.clearCoupon);
  const subtotal = useCartSubtotal();
  const total = useCartTotal();

  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      const settings = data.settings || {};

      const freeAbove = Number(settings.free_shipping_above) || 0;
      const defaultFee = Number(settings.default_shipping_fee) || 120;

      if (subtotal >= freeAbove && freeAbove > 0) {
        setShippingFee(0);
      } else {
        setShippingFee(defaultFee);
      }
    } catch {
      setShippingFee(120);
    } finally {
      setSettingsLoading(false);
    }
  }, [subtotal, setShippingFee]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await fetch(
        `/api/coupons?validate=true&code=${encodeURIComponent(couponInput.trim())}&subtotal=${subtotal}`
      );
      const data = await res.json();

      if (data.valid && data.discountAmount !== undefined) {
        setCoupon(couponInput.trim().toUpperCase());
        setDiscount(data.discountAmount);
        toast.success(`Coupon applied! You save ${CURRENCY_SYMBOL}${data.discountAmount.toLocaleString()}`);
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        clearCoupon();
      }
    } catch {
      setCouponError('Failed to validate coupon');
      clearCoupon();
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput('');
    setCouponError('');
  };

  const handleQtyChange = (id: string, newQty: number) => {
    if (newQty < 1) return;
    updateQuantity(id, newQty);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Shopping Cart" />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start shopping to fill it up!"
          actionLabel="Start Shopping"
          actionView="shop"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Shopping Cart"
        breadcrumbs={[{ label: 'Cart' }]}
      />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">"{items.length} {items.length === 1 ? 'item' : 'items'} in your cart</p>
            <button
              onClick={() => navigate('shop')}
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Continue Shopping
            </button>
          </div>

          {items.map((item) => (
            <Card key={item.id} className="p-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <button
                    onClick={() => navigate('product', { id: item.productId })}
                    className="shrink-0"
                  >
                    <img
                      src={item.productImage || 'https://placehold.co/64x64/f3f4f6/9ca3af?text=No+Image'}
                      alt={item.productName}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover border hover:opacity-80 transition-opacity"
                    />
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate('product', { id: item.productId })}
                          className="text-sm sm:text-base font-medium text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 text-left"
                        >
                          {item.productName}
                        </button>
                        {item.variantName && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>
                        )}
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {CURRENCY_SYMBOL}{item.unitPrice.toLocaleString()}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quantity & Line Total */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                          className="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= item.stock) {
                              updateQuantity(item.id, val);
                            }
                          }}
                          className="h-8 w-12 text-center text-sm border-x bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min={1}
                          max={item.stock}
                        />
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {CURRENCY_SYMBOL}{(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Discount ({couponCode})
                    </span>
                    <span className="font-medium text-emerald-600">-{CURRENCY_SYMBOL}{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    Shipping
                  </span>
                  <span className="font-medium text-gray-900">
                    {settingsLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : shippingFee === 0 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      <span>{CURRENCY_SYMBOL}{shippingFee.toLocaleString()}</span>
                    )}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Coupon Input */}
              {!couponCode ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Coupon Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      className="uppercase"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="shrink-0"
                    >
                      {couponLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500">{couponError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm font-medium">{couponCode}</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                onClick={() => navigate('checkout')}
              >
                Proceed to Checkout
              </Button>

              <button
                onClick={() => navigate('shop')}
                className="w-full text-sm text-center text-gray-500 hover:text-gray-700 py-2"
              >
                Continue Shopping
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
