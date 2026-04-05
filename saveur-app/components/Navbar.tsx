'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import FeedbackModal from './FeedbackModal'

export default function Navbar() {
  const router = useRouter()
  const { user, clear } = useAuthStore()
  const [showFeedback, setShowFeedback] = useState(false)

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch {}
    clear()
    router.push('/')
  }

  return (
    <>
      <nav className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-stone-900">
          Saveur
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/discover" className="text-sm text-stone-600 hover:text-stone-900">
            Discover
          </Link>
          <Link href="/dashboard" className="text-sm text-stone-600 hover:text-stone-900">
            Groups
          </Link>
          <Link href="/preferences" className="text-sm text-stone-600 hover:text-stone-900">
            Preferences
          </Link>
          <button
            onClick={() => setShowFeedback(true)}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            Feedback
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{user?.name || user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  )
}
