'use client';

import React, { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import HomePage from '@/components/pages/HomePage';
import CartPage from '@/components/pages/CartPage';
import CheckoutPage from '@/components/pages/CheckoutPage';
import OrderSuccessPage from '@/components/pages/OrderSuccessPage';
import LoginPage from '@/components/pages/LoginPage';
import RegisterPage from '@/components/pages/RegisterPage';
import AccountPage from '@/components/pages/AccountPage';
import OrderDetailPage from '@/components/pages/OrderDetailPage';
import ShopPage from '@/components/pages/ShopPage';
import ProductDetailPage from '@/components/pages/ProductDetailPage';
import SearchPage from '@/components/pages/SearchPage';
import CategoriesPage from '@/components/pages/CategoriesPage';
import StaticPage from '@/components/pages/StaticPage';
import AdminLayout from '@/components/admin/AdminLayout';
import ChatBot from '@/components/ai/ChatBot';

export default function Home() {
  const initNav = useNavigationStore((s) => s._init);
  const currentView = useNavigationStore((s) => s.currentView);

  // Initialize navigation store (hashchange listener)
  useEffect(() => {
    initNav();
  }, [initNav]);

  // Sync auth state with server
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          useAuthStore.getState().setUser({
            id: data.user.id || data.user.userId,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'customer',
            image: data.user.image,
          });
        } else {
          // If no session, clear local state
          const localUser = useAuthStore.getState().user;
          if (localUser) {
            useAuthStore.getState().setUser(null);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const isAdminView = currentView === 'admin' || currentView.startsWith('admin/');

  const renderView = () => {
    if (isAdminView) {
      return <AdminLayout />;
    }

    switch (currentView) {
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order-success':
        return <OrderSuccessPage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'account':
      case 'account/orders':
      case 'account/addresses':
      case 'account/wishlist':
      case 'account/reviews':
      case 'account/notifications':
        return <AccountPage />;
      case 'account/order-detail':
        return <OrderDetailPage />;
      case 'shop':
        return <ShopPage />;
      case 'product':
        return <ProductDetailPage />;
      case 'search':
        return <SearchPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'page':
        return <StaticPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  if (isAdminView) {
    return <AdminLayout />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        {renderView()}
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
}
