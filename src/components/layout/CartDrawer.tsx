'use client';

import React, { useState } from 'react';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCartStore, useCartSubtotal, useNavigationStore, useUIStore } from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

export default function CartDrawer() {
  const { items, updateQuantity, removeItem, couponCode, setCoupon, clearCoupon, discount, shippingFee } = useCartStore();
  const subtotal = useCartSubtotal();
  const total = subtotal - discount + shippingFee;
  const navigate = useNavigationStore((s) => s.navigate);
  const closeAll = useUIStore((s) => s.closeAll);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch(
        `/api/coupons?validate=true&code=${encodeURIComponent(couponInput)}&subtotal=${subtotal}`
      );
      const data = await res.json();
      if (data.valid) {
        setCoupon(couponInput.trim().toUpperCase());
        useCartStore.getState().setDiscount(data.discount || 0);
        toast({
          title: 'Coupon applied!',
          description: data.message || `You saved ${CURRENCY_SYMBOL}${(data.discount || 0).toLocaleString()}`,
        });
      } else {
        toast({
          title: 'Invalid coupon',
          description: data.error || 'This coupon is not valid.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not validate coupon. Try again.',
        variant: 'destructive',
      });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput('');
  };

  const handleCheckout = () => {
    closeAll();
    navigate('checkout');
  };

  const handleContinueShopping = () => {
    closeAll();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mt-1">
              Looks like you haven&apos;t added anything yet.
            </p>
          </div>
          <Button onClick={handleContinueShopping} variant="outline">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pt-6">
        <SheetTitle>Shopping Cart ({items.length})</SheetTitle>
      </SheetHeader>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 py-3">
            {/* Image */}
            <button
              onClick={() => { closeAll(); navigate('product', { id: item.productId }); }}
              className="h-20 w-20 rounded-lg bg-gray-100 overflow-hidden shrink-0"
            >
              <img
                src={item.productImage || 'https://placehold.co/100x100/f3f4f6/9ca3af?text=?'}
                alt={item.productName}
                className="h-full w-full object-cover"
              />
            </button>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <button
                onClick={() => { closeAll(); navigate('product', { id: item.productId }); }}
                className="text-sm font-medium text-gray-900 line-clamp-2 text-left hover:text-primary transition-colors"
              >
                {item.productName}
              </button>
              {item.variantName && (
                <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                {/* Quantity Controls */}
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-l-md"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="h-7 w-8 flex items-center justify-center text-xs font-medium border-x">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-r-md disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Price + Remove */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {CURRENCY_SYMBOL}{(item.unitPrice * item.quantity).toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 space-y-3">
        {/* Coupon */}
        {!couponCode ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="pl-8 h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponInput.trim()}
              className="shrink-0"
            >
              Apply
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{couponCode}</span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        )}

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{CURRENCY_SYMBOL}{discount.toLocaleString()}</span>
            </div>
          )}
          {shippingFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{CURRENCY_SYMBOL}{shippingFee.toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-gray-900 text-base">
            <span>Total</span>
            <span>{CURRENCY_SYMBOL}{total.toLocaleString()}</span>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleCheckout}>
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}
