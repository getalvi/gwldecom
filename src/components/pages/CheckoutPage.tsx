'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/shared/PageHeader';
import {
  useNavigationStore,
  useCartStore,
  useCartSubtotal,
  useAuthStore,
} from '@/lib/store';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedDays: string;
}

interface Address {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery', icon: Banknote, available: true },
  { value: 'bkash', label: 'bKash', icon: Smartphone, available: false },
  { value: 'nagad', label: 'Nagad', icon: Smartphone, available: false },
  { value: 'sslcommerz', label: 'SSLCommerz (Card/Online)', icon: CreditCard, available: false },
];

const defaultShippingMethods: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: '3-5 business days',
    cost: 120,
    estimatedDays: '3-5',
  },
  {
    id: 'express',
    name: 'Express Shipping',
    description: '1-2 business days',
    cost: 250,
    estimatedDays: '1-2',
  },
  {
    id: 'inside_dhaka',
    name: 'Inside Dhaka',
    description: '1-2 business days',
    cost: 60,
    estimatedDays: '1-2',
  },
];

export default function CheckoutPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const discount = useCartStore((s) => s.discount);
  const setShippingFee = useCartStore((s) => s.setShippingFee);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartSubtotal();
  const total = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) -
    s.discount +
    s.shippingFee
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(defaultShippingMethods);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [notes, setNotes] = useState('');

  // Address form
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    district: '',
    postalCode: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (isAuthenticated && items.length === 0) {
      navigate('cart');
    }
  }, [isAuthenticated, items.length, navigate]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [addressesRes, shippingRes] = await Promise.all([
        fetch('/api/addresses'),
        fetch('/api/settings'),
      ]);
      const addressesData = await addressesRes.json();
      const settingsData = await shippingRes.json();

      const savedAddresses: Address[] = addressesData.addresses || [];
      setAddresses(savedAddresses);

      // Pre-fill form from user data if no saved addresses
      if (savedAddresses.length === 0 && user) {
        setForm(prev => ({
          ...prev,
          fullName: prev.fullName || user.name || '',
          email: prev.email || user.email || '',
        }));
        setShowNewAddress(true);
      } else if (savedAddresses.length > 0) {
        const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
        setSelectedAddressId(defaultAddr.id);
      }

      // Shipping settings
      const settings = settingsData.settings || {};
      // We keep the default shipping methods; settings may adjust free threshold
    } catch {
      // Use defaults
      if (user) {
        setForm(prev => ({
          ...prev,
          fullName: prev.fullName || user.name || '',
          email: prev.email || user.email || '',
        }));
        setShowNewAddress(true);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update shipping fee when method changes
  useEffect(() => {
    const method = shippingMethods.find(m => m.id === selectedShipping);
    if (method) {
      setShippingFee(method.cost);
    }
  }, [selectedShipping, shippingMethods, setShippingFee]);

  // Select first shipping method by default
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShipping) {
      setSelectedShipping(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedShipping]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!showNewAddress) {
      if (!selectedAddressId) errors.address = 'Please select a delivery address';
      return Object.keys(errors).length === 0;
    }
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^[\d+\-\s()]{7,15}$/.test(form.phone.trim())) errors.phone = 'Invalid phone number';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Invalid email address';
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.district.trim()) errors.district = 'District is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getShippingAddress = () => {
    if (!showNewAddress && selectedAddressId) {
      const addr = addresses.find(a => a.id === selectedAddressId);
      if (addr) return addr;
    }
    return {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      addressLine1: form.addressLine1,
      city: form.city,
      district: form.district,
      postalCode: form.postalCode || '',
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }
    if (!selectedShipping) {
      toast.error('Please select a shipping method');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem('shopnova-cart-session') || undefined;
      const shippingAddress = getShippingAddress();

      const body: Record<string, unknown> = {
        shippingAddress: JSON.stringify(shippingAddress),
        shippingMethodId: selectedShipping,
        notes: notes || undefined,
      };
      if (couponCode) body.couponCode = couponCode;
      if (sessionId) body.sessionId = sessionId;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.order) {
        // Store order data in sessionStorage for success page
        sessionStorage.setItem(
          'shopnova-last-order',
          JSON.stringify(data.order)
        );
        clearCart();
        navigate('order-success');
      } else {
        toast.error(data.error || 'Failed to place order. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;
  if (items.length === 0) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Checkout" breadcrumbs={[{ label: 'Cart', href: '#cart' }, { label: 'Checkout' }]} />
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Checkout"
        breadcrumbs={[
          { label: 'Cart', href: '#cart' },
          { label: 'Checkout' },
        ]}
      />

      <div className="space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate('cart')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Cart
        </button>

        {/* 1. Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Saved Addresses */}
            {addresses.length > 0 && !showNewAddress && (
              <div className="grid gap-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-emerald-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{addr.fullName}</p>
                      <p className="text-sm text-gray-600 mt-1">{addr.addressLine1}</p>
                      <p className="text-sm text-gray-500">{addr.city}, {addr.district} {addr.postalCode ? `-${addr.postalCode}` : ''}</p>
                      <p className="text-sm text-gray-500">{addr.phone}</p>
                    </div>
                    {addr.isDefault && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        Default
                      </span>
                    )}
                  </label>
                ))}
                <button
                  onClick={() => setShowNewAddress(true)}
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add a new address
                </button>
              </div>
            )}

            {/* New Address Form */}
            {showNewAddress && (
              <div className="space-y-4">
                {addresses.length > 0 && (
                  <button
                    onClick={() => setShowNewAddress(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    &larr; Use a saved address
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      placeholder="John Doe"
                      aria-invalid={!!formErrors.fullName}
                    />
                    {formErrors.fullName && <p className="text-xs text-red-500">{formErrors.fullName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="01XXXXXXXXX"
                      aria-invalid={!!formErrors.phone}
                    />
                    {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="you@example.com"
                      aria-invalid={!!formErrors.email}
                    />
                    {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={form.postalCode}
                      onChange={(e) => handleFormChange('postalCode', e.target.value)}
                      placeholder="1200"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addressLine1">Address *</Label>
                  <Textarea
                    id="addressLine1"
                    value={form.addressLine1}
                    onChange={(e) => handleFormChange('addressLine1', e.target.value)}
                    placeholder="House, Road, Area"
                    rows={2}
                    aria-invalid={!!formErrors.addressLine1}
                  />
                  {formErrors.addressLine1 && <p className="text-xs text-red-500">{formErrors.addressLine1}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      placeholder="Dhaka"
                      aria-invalid={!!formErrors.city}
                    />
                    {formErrors.city && <p className="text-xs text-red-500">{formErrors.city}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">District *</Label>
                    <Input
                      id="district"
                      value={form.district}
                      onChange={(e) => handleFormChange('district', e.target.value)}
                      placeholder="Dhaka"
                      aria-invalid={!!formErrors.district}
                    />
                    {formErrors.district && <p className="text-xs text-red-500">{formErrors.district}</p>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Delivery Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-emerald-600" />
              Delivery Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping}>
              {shippingMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedShipping === method.id
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={method.id} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {method.cost === 0 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      `${CURRENCY_SYMBOL}${method.cost.toLocaleString()}`
                    )}
                  </p>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 3. Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.productImage || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=No'}
                    alt={item.productName}
                    className="h-12 w-12 rounded-lg object-cover border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-xs text-gray-500">{item.variantName}</p>
                    )}
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 shrink-0">
                    {CURRENCY_SYMBOL}{(item.unitPrice * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Discount ({couponCode})</span>
                  <span className="font-medium text-emerald-600">-{CURRENCY_SYMBOL}{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {useCartStore.getState().shippingFee === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    `${CURRENCY_SYMBOL}${useCartStore.getState().shippingFee.toLocaleString()}`
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{CURRENCY_SYMBOL}{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Order Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for delivery..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <label
                    key={method.value}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPayment === method.value
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!method.available ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        value={method.value}
                        disabled={!method.available}
                      />
                      <Icon className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{method.label}</p>
                        {!method.available && (
                          <p className="text-xs text-gray-400">Coming Soon</p>
                        )}
                      </div>
                    </div>
                    {method.value === 'cod' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </label>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 5. Place Order */}
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            `Place Order  •  ${CURRENCY_SYMBOL}${total.toLocaleString()}`
          )}
        </Button>
      </div>
    </div>
  );
}
