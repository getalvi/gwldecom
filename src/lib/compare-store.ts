// Comparison store — persists up to 4 product slugs for side-by-side comparison.
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_COMPARE = 4

interface CompareState {
  slugs: string[]
  isOpen: boolean
  add: (slug: string) => boolean // returns false if at limit
  remove: (slug: string) => void
  toggle: (slug: string) => boolean // returns true if added, false if removed/rejected
  clear: () => void
  openBar: () => void
  closeBar: () => void
  has: (slug: string) => boolean
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      slugs: [],
      isOpen: false,
      add: (slug) => {
        const s = get().slugs
        if (s.includes(slug)) return true
        if (s.length >= MAX_COMPARE) return false
        set({ slugs: [...s, slug], isOpen: true })
        return true
      },
      remove: (slug) => set({ slugs: get().slugs.filter((x) => x !== slug) }),
      toggle: (slug) => {
        const s = get().slugs
        if (s.includes(slug)) {
          set({ slugs: s.filter((x) => x !== slug) })
          return false
        }
        if (s.length >= MAX_COMPARE) return false
        set({ slugs: [...s, slug], isOpen: true })
        return true
      },
      clear: () => set({ slugs: [], isOpen: false }),
      openBar: () => set({ isOpen: true }),
      closeBar: () => set({ isOpen: false }),
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: 'bdshop-compare' }
  )
)

export const COMPARE_MAX = MAX_COMPARE
