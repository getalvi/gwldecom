"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

export interface CartItem { productId: string; title: string; price: number; imageUrl: string | null; quantity: number; slug: string; }

type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "REMOVE"; productId: string }
  | { type: "UPDATE_QTY"; productId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

function cartReducer(state: { items: CartItem[] }, action: CartAction): { items: CartItem[] } {
  switch (action.type) {
    case "HYDRATE": return { items: action.items };
    case "ADD": {
      const existing = state.items.find(i => i.productId === action.item.productId);
      if (existing) return { items: state.items.map(i => i.productId === action.item.productId ? { ...i, quantity: i.quantity + action.quantity } : i) };
      return { items: [...state.items, { ...action.item, quantity: action.quantity }] };
    }
    case "REMOVE": return { items: state.items.filter(i => i.productId !== action.productId) };
    case "UPDATE_QTY":
      if (action.quantity <= 0) return { items: state.items.filter(i => i.productId !== action.productId) };
      return { items: state.items.map(i => i.productId === action.productId ? { ...i, quantity: action.quantity } : i) };
    case "CLEAR": return { items: [] };
  }
}

const CartContext = createContext<{
  items: CartItem[]; addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (pid: string) => void; updateQuantity: (pid: string, qty: number) => void;
  clear: () => void; subtotal: number; count: number; isEmpty: boolean;
} | null>(null);

const STORAGE_KEY = "shopbd:cart:v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) dispatch({ type: "HYDRATE", items: p }); } } catch { }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); }, [state.items]);
  const subtotal = useMemo(() => state.items.reduce((s, i) => s + i.price * i.quantity, 0), [state.items]);
  const count = useMemo(() => state.items.reduce((s, i) => s + i.quantity, 0), [state.items]);
  return (
    <CartContext.Provider value={{
      items: state.items,
      addItem: (item, qty = 1) => dispatch({ type: "ADD", item, quantity: qty }),
      removeItem: (pid) => dispatch({ type: "REMOVE", productId: pid }),
      updateQuantity: (pid, qty) => dispatch({ type: "UPDATE_QTY", productId: pid, quantity: qty }),
      clear: () => dispatch({ type: "CLEAR" }),
      subtotal, count, isEmpty: state.items.length === 0,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
