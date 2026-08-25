// UI state for transient overlays: cart drawer, quick-view modal, mobile nav.
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  cartDrawerOpen: boolean
  openCartDrawer: () => void
  closeCartDrawer: () => void

  // Recently viewed product slugs (persisted, newest first, max 10)
  recentlyViewed: string[]
  pushRecentlyViewed: (slug: string) => void

  // Recently searched terms (persisted, newest first, max 8)
  recentSearches: string[]
  pushRecentSearch: (term: string) => void
  clearRecentSearches: () => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      cartDrawerOpen: false,
      openCartDrawer: () => set({ cartDrawerOpen: true }),
      closeCartDrawer: () => set({ cartDrawerOpen: false }),

      recentlyViewed: [],
      pushRecentlyViewed: (slug) =>
        set((s) => ({
          recentlyViewed: [
            slug,
            ...s.recentlyViewed.filter((x) => x !== slug),
          ].slice(0, 10),
        })),

      recentSearches: [],
      pushRecentSearch: (term) => {
        const t = term.trim().toLowerCase()
        if (!t) return
        set((s) => ({
          recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8),
        }))
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'bdshop-ui',
      // persist recentlyViewed + recentSearches, not transient drawer state
      partialize: (s) =>
        ({
          recentlyViewed: s.recentlyViewed,
          recentSearches: s.recentSearches,
        }) as UiState,
    }
  )
)
