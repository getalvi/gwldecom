'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree, Tag, Ticket,
  Download, Home, Settings, Menu, Bell, LogOut, ChevronLeft, ShieldX,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { ADMIN_NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminProductForm from './AdminProductForm';
import AdminOrders from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminCategories from './AdminCategories';
import AdminBrands from './AdminBrands';
import AdminCoupons from './AdminCoupons';
import AdminHomepage from './AdminHomepage';
import AdminSettings from './AdminSettings';
import AdminImport from './AdminImport';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree, Tag, Ticket,
  Download, Home, Settings,
};

export default function AdminLayout() {
  const { currentView, viewParams } = useNavigationStore();
  const { user, isAdmin, logout } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">You do not have permission to access the admin panel.</p>
          <Button className="mt-6" onClick={() => navigate('home')}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const getActiveView = () => {
    if (currentView === 'admin/product-edit' && viewParams?.id) return 'product-edit';
    if (currentView === 'admin/product-new') return 'product-new';
    if (currentView === 'admin/products') return 'admin/products';
    if (currentView === 'admin/orders') return 'admin/orders';
    if (currentView === 'admin/customers') return 'admin/customers';
    if (currentView === 'admin/categories') return 'admin/categories';
    if (currentView === 'admin/brands') return 'admin/brands';
    if (currentView === 'admin/coupons') return 'admin/coupons';
    if (currentView === 'admin/homepage') return 'admin/homepage';
    if (currentView === 'admin/settings') return 'admin/settings';
    if (currentView === 'admin/import') return 'admin/import';
    return 'admin';
  };

  const activeView = getActiveView();

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 text-lg">{APP_NAME}</span>
        )}
      </div>
      <Separator />
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-3">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const hrefView = item.href.replace('#', '');
            const isActive = activeView === hrefView ||
              (hrefView === 'admin' && activeView === 'admin') ||
              (hrefView === 'admin' && currentView === 'admin');

            return (
              <button
                key={item.href}
                onClick={() => {
                  navigate(hrefView);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <button
          onClick={() => { navigate('home'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <Home className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Back to Store</span>}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'admin':
        return <AdminDashboard />;
      case 'admin/products':
        return <AdminProducts />;
      case 'product-edit':
      case 'product-new':
        return <AdminProductForm />;
      case 'admin/orders':
        return <AdminOrders />;
      case 'admin/customers':
        return <AdminCustomers />;
      case 'admin/categories':
        return <AdminCategories />;
      case 'admin/brands':
        return <AdminBrands />;
      case 'admin/coupons':
        return <AdminCoupons />;
      case 'admin/homepage':
        return <AdminHomepage />;
      case 'admin/settings':
        return <AdminSettings />;
      case 'admin/import':
        return <AdminImport />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r bg-gray-50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {navContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 z-10 h-6 w-6 rounded-full border bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer hidden lg:flex"
          style={{ transform: 'translateY(80px)' }}
        >
          <ChevronLeft className={`h-3 w-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {navContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {ADMIN_NAV_ITEMS.find((item) => {
                const hrefView = item.href.replace('#', '');
                return hrefView === activeView || (hrefView === 'admin' && activeView === 'admin');
              })?.label || 'Admin'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-32 truncate">
                {user?.name || 'Admin'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-gray-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
