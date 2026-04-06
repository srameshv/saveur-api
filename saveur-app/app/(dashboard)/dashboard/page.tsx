'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { groups as groupsApi, type Group } from '@/lib/api'

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    groupsApi.list()
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : groups

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Your Groups</h1>
        <div className="flex gap-3">
          <Link
            href="/groups/join"
            className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Join group
          </Link>
          <Link
            href="/groups/new"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            New group
          </Link>
        </div>
      </div>

      {!loading && groups.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full mb-6 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
        />
      )}

      {loading && <p className="text-stone-500">Loading…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && groups.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No groups yet.</p>
          <p className="text-sm mt-1">Create one or join with an invite code.</p>
        </div>
      )}

      {!loading && groups.length > 0 && filtered.length === 0 && (
        <p className="text-center text-stone-400 py-12 text-sm">No groups match your search.</p>
      )}

      <div className="grid gap-4">
        {filtered.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="block p-5 bg-white border border-stone-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-stone-900">{g.name}</h2>
                {g.description && <p className="text-sm text-stone-500 mt-1">{g.description}</p>}
              </div>
              <span className="text-xs text-stone-400 font-mono bg-stone-100 px-2 py-1 rounded">
                {g.invite_code}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Created {new Date(g.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
