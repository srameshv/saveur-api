'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    // Redirect to login if auth takes too long
    const timeout = setTimeout(() => {
      router.replace('/login')
    }, 30000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        clearTimeout(timeout)
        setAuth(session.access_token, session.user.id)
        router.replace('/dashboard')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timeout)
        setAuth(session.access_token, session.user.id)
        router.replace('/dashboard')
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router, setAuth])

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-stone-500">Signing you in…</p>
    </main>
  )
}
