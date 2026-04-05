'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'

export interface PickedRestaurant {
  name: string
  cuisine: string | null
  price_range: string | null
  vibe: string | null
  city: string
  pickedAt: string
}

interface AuthState {
  token: string | null
  userId: string | null
  user: User | null
  pick: PickedRestaurant | null
  setAuth: (token: string, userId: string) => void
  setUser: (user: User) => void
  setPick: (pick: PickedRestaurant | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      user: null,
      pick: null,
      setAuth: (token, userId) => {
        localStorage.setItem('access_token', token)
        set({ token, userId })
      },
      setUser: (user) => set({ user }),
      setPick: (pick) => set({ pick }),
      clear: () => {
        localStorage.removeItem('access_token')
        set({ token: null, userId: null, user: null, pick: null })
      },
    }),
    { name: 'saveur-auth', partialize: (s) => ({ token: s.token, userId: s.userId, pick: s.pick }) }
  )
)
