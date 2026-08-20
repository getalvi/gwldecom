'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  User, Package, MapPin, Heart, Star, Bell, LogOut,
  Plus, Trash2, Edit3, Eye, ShoppingCart, CheckCheck,
  Loader2, Settings, ShieldCheck, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmptyState from '@/components/shared/EmptyState';
import ProductCard from '@/components/shared/ProductCard';
import RatingStars from '@/components/shared/RatingStars';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import {
  useNavigationStore, useAuthStore, useCartStore,
} from '@/lib/store';
import { ACCOUNT_NAV_ITEMS, ORDER_STATUSES, CURRENCY_SYMBOL } from '@/lib/constants';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  itemCount?: number;
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

interface WishlistItem {
  id: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    images: { url: string; altText?: string; position: number }[];
    category?: { id: string; name: string; slug: string } | null;
    avgRating: number;
    reviewCount: number;
    stockQuantity: number;
    isFeatured?: boolean;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    images: { url: string; altText?: string; position: number }[];
  } | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

// ─── Icon Map ───────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  User, Package, MapPin, Heart, Star, Bell,
};

// ─── Main Component ─────────────────────────────────────────

export default function AccountPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const currentView = useNavigationStore((s) => s.currentView);
  const viewParams = useNavigationStore((s) => s.viewParams);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  // Determine active sub-view
  const subView = currentView === 'account' ? 'account' : currentView;

  const handleNavClick = (href: string) => {
    const hash = href.startsWith('#') ? href.slice(1) : href;
    navigate(hash);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <AccountSidebar
            activeView={subView}
            onNavigate={handleNavClick}
            onLogout={logout}
          />
        </aside>

        {/* Mobile Tabs */}
        <div className="lg:hidden -mx-4 sm:-mx-6 mb-6">
          <ScrollArea className="w-full">
            <div className="flex gap-1 px-4 sm:px-6 pb-2 min-w-max">
              {ACCOUNT_NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon] || User;
                const itemHash = item.href.startsWith('#') ? item.href.slice(1) : item.href;
                const isActive = subView === itemHash;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {subView === 'account' && <ProfileSection />}
          {subView === 'account/orders' && <OrdersSection />}
          {subView === 'account/addresses' && <AddressesSection />}
          {subView === 'account/wishlist' && <WishlistSection />}
          {subView === 'account/reviews' && <ReviewsSection />}
          {subView === 'account/notifications' && <NotificationsSection />}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────

function AccountSidebar({
  activeView,
  onNavigate,
  onLogout,
}: {
  activeView: string;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* User Card */}
      <Card>
        <CardContent className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-700 font-bold text-xl">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <p className="font-semibold text-gray-900">{user?.name || 'User'}</p>
          <p className="text-sm text-gray-500 truncate">{user?.email || ''}</p>
          <Badge variant="outline" className="mt-2 capitalize text-xs">
            {user?.role || 'Customer'}
          </Badge>
        </CardContent>
      </Card>

      {/* Nav Items */}
      <Card className="p-0">
        <nav className="py-2">
          {ACCOUNT_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || User;
            const itemHash = item.href.startsWith('#') ? item.href.slice(1) : item.href;
            const isActive = activeView === itemHash;
            return (
              <button
                key={item.href}
                onClick={() => onNavigate(item.href)}
                className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}

// ─── Profile Section ────────────────────────────────────────

function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigationStore((s) => s.navigate);

  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [ordersRes, wishlistRes, reviewsRes] = await Promise.all([
          fetch('/api/orders?limit=1'),
          fetch('/api/wishlist?limit=1'),
          fetch('/api/reviews?limit=1&userId=me'),
        ]);
        const ordersData = await ordersRes.json();
        const wishlistData = await wishlistRes.json();
        const reviewsData = await reviewsRes.json();
        setOrdersCount(ordersData.total || ordersData.orders?.length || 0);
        setWishlistCount(wishlistData.total || wishlistData.items?.length || 0);
        setReviewsCount(reviewsData.total || reviewsData.reviews?.length || 0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      // Update via the admin users API or a dedicated profile endpoint
      // For now, just update local state
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, name: form.name.trim() });
      }
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          password: passwords.newPassword,
        }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setChangingPassword(false);
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Orders', value: ordersCount, icon: Package, color: 'bg-blue-50 text-blue-600', onClick: () => navigate('account/orders') },
    { label: 'Wishlist', value: wishlistCount, icon: Heart, color: 'bg-red-50 text-red-500', onClick: () => navigate('account/wishlist') },
    { label: 'Reviews', value: reviewsCount, icon: Star, color: 'bg-amber-50 text-amber-600', onClick: () => navigate('account/reviews') },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">My Profile</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={stat.onClick}
          >
            <CardContent className="p-4 text-center">
              <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Personal Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditing(!editing); setChangingPassword(false); }}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{user?.role || 'Customer'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Password & Security
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setChangingPassword(!changingPassword); setEditing(false); }}
            >
              {changingPassword ? 'Cancel' : 'Change Password'}
            </Button>
          </div>
        </CardHeader>
        {changingPassword && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ─── Orders Section ─────────────────────────────────────────

function OrdersSection() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const found = ORDER_STATUSES.find(s => s.value === status);
    if (found) return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${found.color}`}>{found.label}</span>;
    return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>;
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place your first order, it will appear here."
          actionLabel="Start Shopping"
          actionView="shop"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('account/order-detail', { id: order.id })}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      }) : 'N/A'}
                      {order.itemCount ? ` • ${order.itemCount} item${order.itemCount > 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      {CURRENCY_SYMBOL}{order.totalAmount.toLocaleString()}
                    </p>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Addresses Section ──────────────────────────────────────

function AddressesSection() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '', phone: '', addressLine1: '', city: '', district: '', postalCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addresses');
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const openNew = () => {
    setEditingAddress(null);
    setForm({ fullName: '', phone: '', addressLine1: '', city: '', district: '', postalCode: '' });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditingAddress(addr);
    setForm({
      fullName: addr.fullName, phone: addr.phone, addressLine1: addr.addressLine1,
      city: addr.city, district: addr.district, postalCode: addr.postalCode || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.district.trim()) e.district = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editingAddress ? `/api/addresses/${editingAddress.id}` : '/api/addresses';
      const method = editingAddress ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editingAddress ? 'Address updated' : 'Address added');
        setDialogOpen(false);
        fetchAddresses();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save address');
      }
    } catch {
      toast.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/addresses/${deleteId}`, { method: 'DELETE' });
      toast.success('Address deleted');
      fetchAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse">{[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Addresses</h2>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No saved addresses"
          description="Add a delivery address to speed up your checkout."
          actionLabel="Add Address"
          actionView="account/addresses"
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <Card key={addr.id} className="relative">
              <CardContent className="p-4">
                {addr.isDefault && (
                  <Badge className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-xs">
                    Default
                  </Badge>
                )}
                <p className="font-semibold text-gray-900 text-sm">{addr.fullName}</p>
                <p className="text-sm text-gray-600 mt-1">{addr.addressLine1}</p>
                <p className="text-sm text-gray-500">{addr.city}, {addr.district} {addr.postalCode ? `-${addr.postalCode}` : ''}</p>
                <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(addr)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(addr.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Address Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Input value={form.addressLine1} onChange={e => setForm(p => ({...p, addressLine1: e.target.value}))} />
              {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} />
                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>District *</Label>
                <Input value={form.district} onChange={e => setForm(p => ({...p, district: e.target.value}))} />
                {errors.district && <p className="text-xs text-red-500">{errors.district}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Postal Code</Label>
                <Input value={form.postalCode} onChange={e => setForm(p => ({...p, postalCode: e.target.value}))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingAddress ? 'Update' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Address"
        description="Are you sure you want to delete this address? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

// ─── Wishlist Section ───────────────────────────────────────

function WishlistSection() {
  const navigate = useNavigationStore((s) => s.navigate);
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      setItems(data.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemove = async (id: string) => {
    try {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id }),
      });
      setItems(prev => prev.filter(i => i.product?.id !== id));
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleMoveToCart = (item: WishlistItem) => {
    if (!item.product) return;
    addItem({
      productId: item.product.id,
      productName: item.product.title,
      productImage: item.product.images?.[0]?.url || '',
      unitPrice: item.product.price,
      quantity: 1,
      stock: item.product.stockQuantity,
    });
    toast.success('Added to cart');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">My Wishlist</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">My Wishlist ({items.length})</h2>
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save items you love by clicking the heart icon on products."
          actionLabel="Browse Products"
          actionView="shop"
        />
      ) : (
        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const p = item.product;
              if (!p) return null;
              return (
                <div key={item.id} className="group relative">
                  <ProductCard
                    id={p.id}
                    title={p.title}
                    slug={p.slug}
                    price={p.price}
                    compareAtPrice={p.compareAtPrice}
                    images={p.images.map(i => i.url)}
                    category={p.category?.name}
                    avgRating={p.avgRating}
                    reviewCount={p.reviewCount}
                    stockQuantity={p.stockQuantity}
                    isFeatured={p.isFeatured}
                  />
                  {/* Overlay buttons on hover */}
                  <div className="absolute bottom-16 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleMoveToCart(item); }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleRemove(p.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reviews Section ────────────────────────────────────────

function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews?userId=me')
      .then(r => r.json())
      .then(data => setReviews(data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">My Reviews</h2>
      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Review products you've purchased to help other buyers."
          actionLabel="Browse Products"
          actionView="shop"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {review.product?.images?.[0] && (
                    <img
                      src={review.product.images[0].url}
                      alt={review.product.title || 'Product'}
                      className="h-14 w-14 rounded-lg object-cover border shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {review.product && (
                          <p className="text-sm font-medium text-gray-900">{review.product.title}</p>
                        )}
                        <div className="mt-1">
                          <RatingStars rating={review.rating} size="sm" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        }) : ''}
                      </p>
                    </div>
                    {review.title && <p className="text-sm font-medium text-gray-700 mt-1">{review.title}</p>}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notifications Section ──────────────────────────────────

function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all as read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! Notifications about your orders and account will appear here."
        />
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                notif.read ? 'bg-white border-gray-200' : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${notif.read ? 'bg-gray-300' : 'bg-emerald-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${notif.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-400 shrink-0">
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    }) : ''}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
