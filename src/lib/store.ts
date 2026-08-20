'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface NavHistoryEntry {
  view: string;
  params: Record<string, string>;
}

// ─── Hash Parsing Helpers ────────────────────────────────────

function parseHash(hash: string): { view: string; params: Record<string, string> } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathWithSegments, queryString] = raw.split('?');

  const pathSegments = pathWithSegments.split('/');
  // Remove empty first segment
  const cleanSegments = pathSegments.filter(s => s.length > 0);

  let view: string;
  const params: Record<string, string> = {};

  if (cleanSegments.length === 0) {
    view = 'home';
  } else {
    // Check if first segment is a known top-level view
    const firstSegment = cleanSegments[0];
    const topLevelViews = [
      'home', 'shop', 'categories', 'product', 'cart', 'checkout',
      'login', 'register', 'account', 'admin', 'contact',
      'search', 'wishlist', 'orders', 'page',
    ];

    if (topLevelViews.includes(firstSegment)) {
      if (firstSegment === 'product' && cleanSegments.length > 1) {
        view = 'product';
        params.id = cleanSegments[1];
      } else if (cleanSegments.length > 1) {
        view = cleanSegments.join('/');
      } else {
        view = firstSegment;
      }
    } else {
      // Treat as a page slug
      view = 'page';
      params.slug = cleanSegments.join('/');
    }
  }

  // Parse query string
  if (queryString) {
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        params[key] = decodeURIComponent(value);
      }
    }
  }

  return { view, params };
}

function buildHash(view: string, params?: Record<string, string>): string {
  let hash = `#${view}`;
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    hash += `?${qs}`;
  }
  return hash;
}

// ─── Navigation Store ───────────────────────────────────────

interface NavigationState {
  currentView: string;
  viewParams: Record<string, string>;
  history: NavHistoryEntry[];
  _initialized: boolean;
  navigate: (view: string, params?: Record<string, string>) => void;
  goBack: () => void;
  _init: () => void;
  _handleHashChange: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: 'home',
  viewParams: {},
  history: [],
  _initialized: false,

  _init: () => {
    if (get()._initialized) return;
    const { view, params } = parseHash(window.location.hash || '#home');
    set({ currentView: view, viewParams: params, _initialized: true });

    window.addEventListener('hashchange', get()._handleHashChange);
  },

  _handleHashChange: () => {
    const { view, params } = parseHash(window.location.hash || '#home');
    const { history, currentView, viewParams: currentParams } = get();

    // Push current to history if it's different
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.view !== currentView || JSON.stringify(lastEntry.params) !== JSON.stringify(currentParams)) {
      set({
        history: [...history, { view: currentView, params: currentParams }].slice(-50),
      });
    }

    set({ currentView: view, viewParams: params });
  },

  navigate: (view, params) => {
    const hash = buildHash(view, params);
    window.location.hash = hash;
  },

  goBack: () => {
    const { history } = get();
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const hash = buildHash(prev.view, prev.params);
      set(s => ({ history: s.history.slice(0, -1) }));
      window.location.hash = hash;
    } else {
      window.location.hash = '#home';
    }
  },
}));

// ─── Auth Store ─────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isAdmin: user?.role === 'admin',
        });
      },
      logout: () => {
        set({ user: null, isAuthenticated: false, isAdmin: false });
        // Clear any server-side session
        fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
        window.location.hash = '#home';
      },
    }),
    {
      name: 'shopnova-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// ─── Cart Store ─────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  shippingFee: number;
  addItem: (item: Omit<CartItem, 'id'> & { id?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string | null) => void;
  clearCoupon: () => void;
  setShippingFee: (fee: number) => void;
  setDiscount: (amount: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,
      shippingFee: 0,

      addItem: (item) => {
        const { items } = get();
        // Check if same product+variant already exists
        const existingIndex = items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId
        );

        if (existingIndex >= 0) {
          const existing = items[existingIndex];
          const newQty = Math.min(existing.quantity + item.quantity, existing.stock);
          const updated = [...items];
          updated[existingIndex] = { ...existing, quantity: newQty };
          set({ items: updated });
        } else {
          const newItem: CartItem = {
            ...item,
            id: item.id || `${item.productId}-${item.variantId || 'default'}-${Date.now()}`,
          };
          set({ items: [...items, newItem] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        const { items } = get();
        if (quantity <= 0) {
          set({ items: items.filter((i) => i.id !== id) });
          return;
        }
        set({
          items: items.map((i) =>
            i.id === id ? { ...i, quantity: Math.min(quantity, i.stock) } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [], couponCode: null, discount: 0, shippingFee: 0 });
      },

      setCoupon: (code) => set({ couponCode: code }),
      clearCoupon: () => set({ couponCode: null, discount: 0 }),
      setShippingFee: (fee) => set({ shippingFee: fee }),
      setDiscount: (amount) => set({ discount: amount }),
    }),
    {
      name: 'shopnova-cart',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    }
  )
);

// Derived cart selectors
export const useCartItemCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

export const useCartSubtotal = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

export const useCartTotal = () =>
  useCartStore((s) => {
    const subtotal = s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return subtotal - s.discount + s.shippingFee;
  });

// ─── UI Store ───────────────────────────────────────────────

interface UIState {
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  cartOpen: boolean;
  toggleSearch: () => void;
  toggleMobileMenu: () => void;
  toggleCart: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  mobileMenuOpen: false,
  cartOpen: false,
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen, mobileMenuOpen: false, cartOpen: false })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen, searchOpen: false, cartOpen: false })),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen, searchOpen: false, mobileMenuOpen: false })),
  closeAll: () => set({ searchOpen: false, mobileMenuOpen: false, cartOpen: false }),
}));
