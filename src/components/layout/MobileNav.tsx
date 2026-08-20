'use client';

import React from 'react';
import {
  User,
  Package,
  MapPin,
  Heart,
  Star,
  Bell,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { APP_NAME, NAV_ITEMS, ACCOUNT_NAV_ITEMS } from '@/lib/constants';
import { useNavigationStore, useAuthStore } from '@/lib/store';

interface MobileNavProps {
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  User,
  Package,
  MapPin,
  Heart,
  Star,
  Bell,
};

export default function MobileNav({ onClose }: MobileNavProps) {
  const { user, isAdmin, logout } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleNav = (view: string, params?: Record<string, string>) => {
    navigate(view, params);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          {APP_NAME}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Main Nav */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const href = item.href.startsWith('#') ? item.href.slice(1) : item.href;
            const [path, qs] = href.split('?');
            const params: Record<string, string> = {};
            if (qs) {
              qs.split('&').forEach((pair) => {
                const [k, v] = pair.split('=');
                if (k && v) params[k] = v;
              });
            }
            return (
              <button
                key={item.label}
                onClick={() => handleNav(path, params)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <Separator className="my-4" />

        {/* User Section */}
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {ACCOUNT_NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon] || User;
                const href = item.href.startsWith('#') ? item.href.slice(1) : item.href;
                const path = href;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNav(path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {isAdmin && (
              <>
                <Separator className="my-4" />
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Panel
                </button>
              </>
            )}

            <Separator className="my-4" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleNav('login')}
            >
              Login
            </Button>
            <Button
              className="w-full"
              onClick={() => handleNav('register')}
            >
              Create Account
            </Button>
          </div>
        )}

        <Separator className="my-4" />

        {/* Quick Links */}
        <nav className="space-y-1">
          <button
            onClick={() => handleNav('wishlist')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" />
            Wishlist
          </button>
          <button
            onClick={() => handleNav('cart')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
          </button>
        </nav>
      </div>
    </div>
  );
}
