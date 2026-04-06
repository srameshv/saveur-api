'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { groups, sessions as sessionsApi, type Group, type DinnerSession } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function GroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [group, setGroup] = useState<Group | null>(null)
  const [sessions, setSessions] = useState<DinnerSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // new session form
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([groups.get(id), sessionsApi.listForGroup(id)])
      .then(([g, s]) => { setGroup(g); setSessions(s) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const s = await sessionsApi.create(id, title, city)
      setSessions((prev) => [s, ...prev])
      setShowForm(false)
      setTitle('')
      setCity('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteGroup() {
    if (!confirm('Delete this group? This cannot be undone.')) return
    setDeleting(true)
    try {
      await groups.delete(id)
      router.replace('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
      setDeleting(false)
    }
  }

  if (loading) return <p className="text-stone-500">Loading…</p>
  if (error) return <p className="text-red-500">{error}</p>
  if (!group) return null

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-600 mb-6">
        ← Back
      </button>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-900">{group.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-stone-400 font-mono bg-stone-100 px-2 py-1 rounded">
            {group.invite_code}
          </span>
          {group.created_by === user?.id && (
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete group'}
            </button>
          )}
        </div>
      </div>
      {group.description && <p className="text-stone-500 mb-6">{group.description}</p>}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">Dinner Sessions</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          New session
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSession} className="mb-6 p-4 bg-white border border-stone-200 rounded-xl space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Session title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Friday dinner"
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder="New York"
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-stone-200 rounded-lg text-sm hover:bg-stone-50">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {sessions.length === 0 ? (
        <p className="text-center text-stone-400 py-12">No sessions yet. Create one to get AI recommendations.</p>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900">{s.title}</h3>
                  <p className="text-sm text-stone-500 mt-0.5">{s.city}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  s.status === 'open'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-stone-100 text-stone-500'
                }`}>
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-2">{new Date(s.created_at).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
