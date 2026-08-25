// Client-side session store. Fetches the current user on mount and exposes
// login/register/logout actions. Used by header + protected views.
'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Role } from '@/lib/types'

export interface SessionUserT {
  id: string
  email: string
  role: Role
  fullName: string | null
}

interface SessionState {
  user: SessionUserT | null
  loading: boolean
  fetch: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  loading: true,
  fetch: async () => {
    try {
      const user = await api<SessionUserT>('/api/auth/me')
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
  login: async (email, password) => {
    const user = await api<SessionUserT>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    set({ user })
  },
  register: async (email, password, fullName) => {
    const user = await api<SessionUserT>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    })
    set({ user })
  },
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
