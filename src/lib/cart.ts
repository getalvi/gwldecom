// Client-side cart store. Persists to localStorage so the cart survives reloads.
// Also tracks "saved for later" items (moved out of the active cart but kept
// for easy restore — like Amazon's "Saved for later" list).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/lib/types'

interface CartState {
  items: CartItem[]
  savedItems: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantKey?: string) => void
  updateQty: (productId: string, qty: number, variantKey?: string) => void
  clear: () => void
  total: () => number
  count: () => number
  // saved-for-later
  saveForLater: (productId: string, variantKey?: string) => void
  moveToCart: (productId: string, variantKey?: string) => void
  removeSaved: (productId: string, variantKey?: string) => void
  savedCount: () => number
}

function variantKey(v?: Record<string, string>): string {
  if (!v) return ''
  return JSON.stringify(v)
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],
      addItem: (item) =>
        set((state) => {
          const key = variantKey(item.variant)
          const existing = state.items.find(
            (i) => i.productId === item.productId && variantKey(i.variant) === key
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && variantKey(i.variant) === key
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock || 99) }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (productId, vKey) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && variantKey(i.variant) === (vKey || ''))
          ),
        })),
      updateQty: (productId, qty, vKey) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && variantKey(i.variant) === (vKey || '')
              ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock || 99)) }
              : i
          ),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),

      // Move an item from the active cart to the saved-for-later list.
      saveForLater: (productId, vKey) =>
        set((state) => {
          const item = state.items.find(
            (i) => i.productId === productId && variantKey(i.variant) === (vKey || '')
          )
          if (!item) return state
          // don't duplicate in saved
          const alreadySaved = state.savedItems.some(
            (i) => i.productId === productId && variantKey(i.variant) === (vKey || '')
          )
          return {
            items: state.items.filter(
              (i) => !(i.productId === productId && variantKey(i.variant) === (vKey || ''))
            ),
            savedItems: alreadySaved
              ? state.savedItems
              : [...state.savedItems, { ...item, quantity: 1 }],
          }
        }),
      // Move a saved item back into the active cart.
      moveToCart: (productId, vKey) =>
        set((state) => {
          const item = state.savedItems.find(
            (i) => i.productId === productId && variantKey(i.variant) === (vKey || '')
          )
          if (!item) return state
          const key = variantKey(item.variant)
          const existing = state.items.find(
            (i) => i.productId === item.productId && variantKey(i.variant) === key
          )
          let items
          if (existing) {
            items = state.items.map((i) =>
              i.productId === item.productId && variantKey(i.variant) === key
                ? { ...i, quantity: Math.min(i.quantity + 1, i.stock || 99) }
                : i
            )
          } else {
            items = [...state.items, { ...item, quantity: 1 }]
          }
          return {
            items,
            savedItems: state.savedItems.filter(
              (i) => !(i.productId === productId && variantKey(i.variant) === (vKey || ''))
            ),
          }
        }),
      removeSaved: (productId, vKey) =>
        set((state) => ({
          savedItems: state.savedItems.filter(
            (i) => !(i.productId === productId && variantKey(i.variant) === (vKey || ''))
          ),
        })),
      savedCount: () => get().savedItems.length,
    }),
    { name: 'bdshop-cart' }
  )
)

// --- Abandoned cart beacon ---
// When the cart changes, throttle-post its contents to /api/abandoned-carts
// so the admin can see what products are being left in carts (recovery insight).
// Only runs in the browser; silently fails if the request errors.
let beaconTimer: ReturnType<typeof setTimeout> | null = null
let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return ''
  try {
    const k = 'bdshop_sid'
    let v = localStorage.getItem(k)
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(k, v)
    }
    sessionId = v
    return v
  } catch {
    return ''
  }
}

useCart.subscribe((state) => {
  if (typeof window === 'undefined') return
  if (beaconTimer) clearTimeout(beaconTimer)
  beaconTimer = setTimeout(() => {
    const items = state.items
    if (!items.length) return
    fetch('/api/abandoned-carts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
        })),
        sessionId: getSessionId(),
      }),
    }).catch(() => {})
  }, 3000) // throttle: 3s after last change
})
