'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  Heart,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { APP_NAME, NAV_ITEMS } from '@/lib/constants';
import {
  useNavigationStore,
  useAuthStore,
  useUIStore,
  useCartItemCount,
} from '@/lib/store';
import MobileNav from './MobileNav';
import SearchOverlay from './SearchOverlay';
import CartDrawer from './CartDrawer';

export default function Header() {
  const { user, isAdmin, logout } = useAuthStore();
  const cartItemCount = useCartItemCount();
  const { searchOpen, mobileMenuOpen, cartOpen, toggleSearch, toggleMobileMenu, toggleCart } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [announcementText, setAnnouncementText] = useState('Free shipping on orders over ৳2,000! Use code WELCOME10 for 10% off.');

  // Initialize navigation store
  const initNav = useNavigationStore((s) => s._init);
  useEffect(() => {
    initNav();
  }, [initNav]);

  // Listen for scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch store settings for announcement
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.announcement_text) {
          setAnnouncementText(data.announcement_text);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Announcement Bar */}
      {announcementVisible && (
        <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-2 px-4 relative">
          <p className="truncate px-6">{announcementText}</p>
          <button
            onClick={() => setAnnouncementVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
            aria-label="Dismiss announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div
        className={`bg-white border-b transition-all duration-300 ${
          scrolled ? 'backdrop-blur-md bg-white/95 shadow-sm' : ''
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Mobile Menu Trigger */}
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Logo */}
            <button
              onClick={() => useNavigationStore.getState().navigate('home')}
              className="flex items-center gap-2 shrink-0"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:block">
                {APP_NAME}
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
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
                  <Button
                    key={item.label}
                    variant="ghost"
                    className="text-gray-700 hover:text-primary hover:bg-primary/5 font-medium text-sm"
                    onClick={() => useNavigationStore.getState().navigate(path, params)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 hover:text-primary"
                onClick={toggleSearch}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Wishlist - desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex text-gray-700 hover:text-primary"
                onClick={() => useNavigationStore.getState().navigate('wishlist')}
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-700 hover:text-primary"
                onClick={toggleCart}
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-primary text-primary-foreground">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 text-gray-700 hover:text-primary">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                        {user.name}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 hidden md:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => useNavigationStore.getState().navigate('account')}>
                      <User className="mr-2 h-4 w-4" /> My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => useNavigationStore.getState().navigate('account/orders')}>
                      <ShoppingBag className="mr-2 h-4 w-4" /> My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => useNavigationStore.getState().navigate('account/wishlist')}>
                      <Heart className="mr-2 h-4 w-4" /> Wishlist
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => useNavigationStore.getState().navigate('admin')}>
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-primary font-medium"
                    onClick={() => useNavigationStore.getState().navigate('login')}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="font-medium"
                    onClick={() => useNavigationStore.getState().navigate('register')}
                  >
                    Register
                  </Button>
                </div>
              )}

              {/* Mobile Login/Profile */}
              {!user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden text-gray-700 hover:text-primary"
                  onClick={() => useNavigationStore.getState().navigate('login')}
                  aria-label="Login"
                >
                  <User className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={(open) => { if (!open) useUIStore.getState().closeAll(); }}>
        <SheetContent side="left" className="p-0 w-80">
          <MobileNav onClose={() => useUIStore.getState().closeAll()} />
        </SheetContent>
      </Sheet>

      {/* Search Overlay */}
      {searchOpen && <SearchOverlay onClose={() => useUIStore.getState().closeAll()} />}

      {/* Cart Drawer */}
      <Sheet open={cartOpen} onOpenChange={(open) => { if (!open) useUIStore.getState().closeAll(); }}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-md">
          <CartDrawer />
        </SheetContent>
      </Sheet>
    </header>
  );
}
