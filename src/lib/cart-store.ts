"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type CartItem = {
  id: string; productId: string; title: string; slug: string; price: number; image: string; quantity: number; variant?: Record<string, string>
}
type CartState = {
  items: CartItem[]
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  subtotal: () => number
  count: () => number
}
export const useCart = create<CartState>()(
  persist((set, get) => ({
    items: [],
    add: (item, qty = 1) => set((s) => {
      const ex = s.items.find((i) => i.id === item.id)
      if (ex) return { items: s.items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i) }
      return { items: [...s.items, { ...item, quantity: qty }] }
    }),
    remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i) })),
    clear: () => set({ items: [] }),
    subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    count: () => get().items.reduce((s, i) => s + i.quantity, 0),
  }), { name: "shophaat-cart" })
)
