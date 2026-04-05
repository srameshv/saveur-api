'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { recommendations as recsApi, places as placesApi, type Restaurant, type PlaceResult } from '@/lib/api'

type Tab = 'ai' | 'search'

type AnyRestaurant =
  | { source: 'ai'; data: Restaurant }
  | { source: 'places'; data: PlaceResult }

function getName(r: AnyRestaurant) {
  return r.data.name
}

export default function DiscoverPage() {
  const { user, pick, setPick } = useAuthStore()
  const [tab, setTab] = useState<Tab>('ai')
  const [city, setCity] = useState('')
  const [pickedName, setPickedName] = useState<string | null>(pick?.name ?? null)

  // AI tab state
  const [aiRestaurants, setAiRestaurants] = useState<Restaurant[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Search tab state
  const [searchRestaurants, setSearchRestaurants] = useState<PlaceResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (user?.city) setCity(user.city)
  }, [user])

  async function handleAiFind(e: React.FormEvent) {
    e.preventDefault()
    if (!city.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiRestaurants([])
    setAiSummary('')
    try {
      const r = await recsApi.generate(city.trim())
      setAiRestaurants(r.result?.recommendations ?? [])
      setAiSummary(r.result?.summary ?? '')
    } catch {
      setAiError('AI recommendations are temporarily unavailable. Please try again later.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!city.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchRestaurants([])
    try {
      const cuisines = user?.preferences?.cuisines ?? []
      const diets = user?.preferences?.diets ?? []
      const r = await placesApi.search(city.trim(), cuisines, diets)
      setSearchRestaurants(r.results)
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  function handlePick(name: string, data: Restaurant | PlaceResult) {
    const newPick = {
      name,
      cuisine: data.cuisine ?? null,
      price_range: data.price_range ?? null,
      vibe: 'vibe' in data ? (data.vibe ?? null) : null,
      city: city.trim(),
      pickedAt: new Date().toISOString(),
    }
    setPick(newPick)
    setPickedName(name)
  }

  function clearPick() {
    setPick(null)
    setPickedName(null)
  }

  function orderUrl(platform: 'ubereats' | 'doordash', name: string) {
    const q = encodeURIComponent(`${name} ${city}`)
    if (platform === 'ubereats') return `https://www.ubereats.com/search?q=${q}`
    return `https://www.doordash.com/search/store/${encodeURIComponent(name)}/`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Find a Restaurant</h1>
      <p className="text-stone-500 mb-6">Discover where to eat tonight.</p>

      {/* Tonight's pick banner */}
      {pick && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-orange-500 font-medium mb-0.5">Tonight&apos;s pick</p>
            <p className="font-semibold text-stone-900">{pick.name}</p>
            <p className="text-sm text-stone-500">{pick.city}{pick.cuisine ? ` · ${pick.cuisine}` : ''}{pick.price_range ? ` · ${pick.price_range}` : ''}</p>
            <div className="flex gap-3 mt-2">
              <a href={orderUrl('ubereats', pick.name)} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-white bg-[#06C167] px-3 py-1.5 rounded-lg hover:opacity-90">
                Uber Eats
              </a>
              <a href={orderUrl('doordash', pick.name)} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-white bg-[#FF3008] px-3 py-1.5 rounded-lg hover:opacity-90">
                DoorDash
              </a>
            </div>
          </div>
          <button onClick={clearPick} className="text-stone-400 hover:text-stone-600 text-xl leading-none mt-0.5">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('ai')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'ai' ? 'bg-orange-500 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          AI Picks
        </button>
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'search' ? 'bg-orange-500 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Search (4.3+ rated)
        </button>
      </div>

      {/* City input + action */}
      {tab === 'ai' ? (
        <form onSubmit={handleAiFind} className="flex gap-3 mb-6">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter a city (e.g. New York)"
            required
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
          <button type="submit" disabled={aiLoading}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm">
            {aiLoading ? 'Finding…' : 'Find'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter a city or neighbourhood"
            required
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
          <button type="submit" disabled={searchLoading}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm">
            {searchLoading ? 'Searching…' : 'Search'}
          </button>
        </form>
      )}

      {/* AI tab content */}
      {tab === 'ai' && (
        <>
          {aiError && <p className="text-red-500 text-sm mb-4">{aiError}</p>}
          {aiSummary && <p className="text-sm text-stone-500 italic mb-4">{aiSummary}</p>}
          <div className="grid gap-4">
            {aiRestaurants.map((r) => {
              const isPicked = pickedName === r.name
              return (
                <RestaurantCard
                  key={r.name}
                  name={r.name}
                  cuisine={r.cuisine ?? null}
                  price_range={r.price_range ?? null}
                  vibe={r.vibe ?? null}
                  why={r.why ?? null}
                  address={r.address ?? null}
                  rating={null}
                  maps_url={null}
                  isPicked={isPicked}
                  onPick={() => handlePick(r.name, r)}
                  orderUrl={orderUrl}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Search tab content */}
      {tab === 'search' && (
        <>
          {/* Active preference chips */}
          {((user?.preferences?.cuisines?.length ?? 0) > 0 || (user?.preferences?.diets?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-stone-400">Filtering by:</span>
              {user?.preferences?.cuisines?.map((c) => (
                <span key={c} className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">{c}</span>
              ))}
              {user?.preferences?.diets?.map((d) => (
                <span key={d} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{d}</span>
              ))}
            </div>
          )}
          {searchError && <p className="text-red-500 text-sm mb-4">{searchError}</p>}
          {searchRestaurants.length === 0 && !searchLoading && (
            <p className="text-center text-stone-400 py-12 text-sm">Enter a city or neighbourhood and hit Search.</p>
          )}
          <div className="grid gap-4">
            {searchRestaurants.map((r) => {
              const isPicked = pickedName === r.name
              return (
                <RestaurantCard
                  key={r.name + r.address}
                  name={r.name}
                  cuisine={r.cuisine}
                  price_range={r.price_range}
                  vibe={null}
                  why={null}
                  address={r.address}
                  rating={r.rating}
                  maps_url={r.maps_url}
                  isPicked={isPicked}
                  onPick={() => handlePick(r.name, r)}
                  orderUrl={orderUrl}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

interface CardProps {
  name: string
  cuisine: string | null
  price_range: string | null
  vibe: string | null
  why: string | null
  address: string | null
  rating: number | null
  maps_url: string | null
  isPicked: boolean
  onPick: () => void
  orderUrl: (platform: 'ubereats' | 'doordash', name: string) => string
}

function RestaurantCard({ name, cuisine, price_range, vibe, why, address, rating, maps_url, isPicked, onPick, orderUrl }: CardProps) {
  return (
    <div className={`p-5 rounded-xl border transition-all ${
      isPicked ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-stone-200 bg-white hover:border-stone-300'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-semibold text-stone-900">{name}</h2>
            {price_range && <span className="text-xs text-stone-400">{price_range}</span>}
            {cuisine && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{cuisine}</span>}
            {rating && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>
          {vibe && <p className="text-sm text-stone-500">{vibe}</p>}
          {why && <p className="text-sm text-orange-600 mt-1">{why}</p>}
          {address && <p className="text-xs text-stone-400 mt-1">{address}</p>}
          {maps_url && (
            <a href={maps_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline mt-1 inline-block">
              View on Google Maps
            </a>
          )}
        </div>
        {isPicked && (
          <span className="shrink-0 text-xs font-semibold text-orange-500 bg-orange-100 px-2 py-1 rounded-full">Picked</span>
        )}
      </div>

      {isPicked ? (
        <div className="flex gap-3 mt-4">
          <a href={orderUrl('ubereats', name)} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-medium text-white bg-[#06C167] px-4 py-2 rounded-lg hover:opacity-90">
            Order on Uber Eats
          </a>
          <a href={orderUrl('doordash', name)} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-medium text-white bg-[#FF3008] px-4 py-2 rounded-lg hover:opacity-90">
            Order on DoorDash
          </a>
        </div>
      ) : (
        <button onClick={onPick}
          className="mt-4 w-full py-2 border border-stone-200 text-stone-700 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors">
          Choose this
        </button>
      )}
    </div>
  )
}
