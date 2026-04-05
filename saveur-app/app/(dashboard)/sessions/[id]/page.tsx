'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  sessions as sessionsApi,
  recommendations as recsApi,
  type DinnerSession,
  type SessionRestaurant,
  type SessionResults,
} from '@/lib/api'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<DinnerSession | null>(null)
  const [restaurants, setRestaurants] = useState<SessionRestaurant[]>([])
  const [results, setResults] = useState<SessionResults | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [recSummary, setRecSummary] = useState<string>('')
  const [loadingRec, setLoadingRec] = useState(false)
  const [loadingVote, setLoadingVote] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Add restaurant form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCuisine, setAddCuisine] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load session once
  useEffect(() => {
    sessionsApi.get(id).then(setSession).catch((e) => setError(e.message))
  }, [id])

  // Load initial data + start polling once session is loaded
  useEffect(() => {
    if (!session) return

    async function refresh() {
      const [rests, res] = await Promise.all([
        sessionsApi.restaurants(id).catch(() => null),
        sessionsApi.results(id).catch(() => null),
      ])
      if (rests) setRestaurants(rests)
      if (res) setResults(res)
    }

    // Load my existing votes once
    sessionsApi.votes(id).then((vs) => {
      const map: Record<string, number> = {}
      vs.forEach((v) => { map[v.restaurant_name] = v.score })
      setVotes(map)
    }).catch(() => {})

    refresh()
    pollRef.current = setInterval(refresh, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id, session])

  async function generateRecs() {
    if (!session) return
    setLoadingRec(true)
    setError('')
    try {
      const r = await recsApi.generate(session.city, session.id)
      setRecSummary(r.result?.summary ?? '')
      // Restaurants will appear via the next poll (within 5s)
      const rests = await sessionsApi.restaurants(id)
      setRestaurants(rests)
    } catch {
      setError('AI recommendations are temporarily unavailable. Please try again later.')
    } finally {
      setLoadingRec(false)
    }
  }

  async function submitVote(restaurantName: string, score: number) {
    setLoadingVote(restaurantName)
    try {
      await sessionsApi.vote(id, restaurantName, score)
      setVotes((prev) => ({ ...prev, [restaurantName]: score }))
      const r = await sessionsApi.results(id)
      setResults(r)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Vote failed')
    } finally {
      setLoadingVote(null)
    }
  }

  async function handleAddRestaurant(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const r = await sessionsApi.addRestaurant(id, {
        name: addName.trim(),
        cuisine: addCuisine.trim() || undefined,
        price_range: addPrice || undefined,
      })
      setRestaurants((prev) => [...prev, r])
      setAddName('')
      setAddCuisine('')
      setAddPrice('')
      setShowAddForm(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add restaurant')
    } finally {
      setAdding(false)
    }
  }

  if (error && !session) return <p className="text-red-500">{error}</p>
  if (!session) return <p className="text-stone-500">Loading…</p>

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-600 mb-6">
        ← Back
      </button>

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-stone-900">{session.title}</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 ${
          session.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'
        }`}>
          {session.status}
        </span>
      </div>
      <p className="text-stone-500 mb-6">{session.city}</p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* AI Recommendations button */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={generateRecs}
          disabled={loadingRec}
          className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
        >
          {loadingRec ? 'Getting AI recommendations…' : 'Get AI Recommendations'}
        </button>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setAddError('') }}
          className="px-5 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors text-sm"
        >
          + Add a restaurant
        </button>
      </div>

      {recSummary && (
        <p className="text-sm text-stone-500 italic mb-4">{recSummary}</p>
      )}

      {/* Manual add form */}
      {showAddForm && (
        <form onSubmit={handleAddRestaurant} className="mb-6 p-4 bg-white border border-stone-200 rounded-xl space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Restaurant name *</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
              placeholder="e.g. Joe's Pizza"
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">Cuisine</label>
              <input
                type="text"
                value={addCuisine}
                onChange={(e) => setAddCuisine(e.target.value)}
                placeholder="e.g. Italian"
                className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Price</label>
              <select
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                className="px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm h-[38px]"
              >
                <option value="">—</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
            </div>
          </div>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2 border border-stone-200 rounded-lg text-sm hover:bg-stone-50">
              Cancel
            </button>
            <button type="submit" disabled={adding} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Restaurant list */}
      {restaurants.length === 0 ? (
        <p className="text-center text-stone-400 py-12">No restaurants yet. Get AI recommendations or add one manually.</p>
      ) : (
        <div className="grid gap-4 mb-10">
          {restaurants.map((r) => {
            const myVote = votes[r.name]
            const resultForR = results?.results.find((x) => x.restaurant_name === r.name)
            return (
              <div key={r.id} className="p-5 bg-white border border-stone-200 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-900">{r.name}</h3>
                      {r.price_range && <span className="text-xs text-stone-400">{r.price_range}</span>}
                      {r.cuisine && (
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{r.cuisine}</span>
                      )}
                      {r.source === 'ai' && (
                        <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded">AI pick</span>
                      )}
                    </div>
                    {r.vibe && <p className="text-sm text-stone-500 mt-1">{r.vibe}</p>}
                    {r.address && <p className="text-xs text-stone-400 mt-1">{r.address}</p>}
                  </div>
                  {resultForR && (
                    <div className="text-center shrink-0">
                      <div className="text-2xl font-bold text-stone-900">
                        {resultForR.average_score.toFixed(1)}
                      </div>
                      <div className="text-xs text-stone-400">{resultForR.vote_count} vote{resultForR.vote_count !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                </div>

                {session.status === 'open' && (
                  <div className="mt-4">
                    <p className="text-xs text-stone-400 mb-2">Your vote</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => submitVote(r.name, score)}
                          disabled={loadingVote === r.name}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                            myVote === score
                              ? 'bg-orange-500 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-orange-100 hover:text-orange-700'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Results leaderboard */}
      {results && results.results.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Standings</h2>
          <div className="space-y-3">
            {results.results.map((r, i) => (
              <div key={r.restaurant_name} className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl">
                <span className="text-2xl font-bold text-stone-300 w-8">#{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-stone-900">{r.restaurant_name}</p>
                  <p className="text-xs text-stone-400">{r.vote_count} vote{r.vote_count !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-xl font-bold text-orange-500">{r.average_score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
