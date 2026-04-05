'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { users } from '@/lib/api'
import Navbar from '@/components/Navbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, setUser } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.push('/login')
      return
    }
    users.me().then(setUser).catch(() => {
      router.push('/login')
    })
  }, [hydrated, token, router, setUser])

  if (!hydrated || !token) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">{children}</div>
    </div>
  )
}
