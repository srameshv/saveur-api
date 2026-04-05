'use client'

import { useState } from 'react'
import { feedback as feedbackApi } from '@/lib/api'

interface Props {
  onClose: () => void
}

export default function FeedbackModal({ onClose }: Props) {
  const [type, setType] = useState<'bug' | 'feature'>('feature')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await feedbackApi.submit(type, message)
      setDone(true)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">🙏</p>
            <h2 className="text-lg font-semibold text-stone-900 mb-1">Thanks for your feedback!</h2>
            <p className="text-sm text-stone-500 mb-4">We'll use it to improve Saveur.</p>
            <button onClick={onClose} className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Send Feedback</h2>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('feature')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === 'feature'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Feature request
                </button>
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === 'bug'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Bug report
                </button>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder={type === 'bug' ? 'Describe what went wrong…' : 'What would you like to see?'}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
