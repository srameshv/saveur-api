'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { users } from '@/lib/api'

const CUISINE_OPTIONS = ['Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek']
const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Dairy-free', 'Nut-free']
const VIBE_OPTIONS = ['Casual', 'Fine dining', 'Trendy', 'Cozy', 'Outdoor', 'Rooftop', 'Fast casual', 'Family-friendly']

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        selected
          ? 'bg-orange-500 text-white'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  )
}

export default function PreferencesPage() {
  const router = useRouter()
  const [cuisines, setCuisines] = useState<string[]>([])
  const [diets, setDiets] = useState<string[]>([])
  const [vibes, setVibes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    users.getPreferences()
      .then((p) => { setCuisines(p.cuisines); setDiets(p.diets); setVibes(p.vibes) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await users.updatePreferences({ cuisines, diets, vibes })
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-stone-500">Loading…</p>

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Your Preferences</h1>
      <p className="text-stone-500 mb-8">These help Claude tailor recommendations for your group.</p>

      <form onSubmit={handleSave} className="space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Cuisines</h2>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <ToggleChip key={c} label={c} selected={cuisines.includes(c)} onToggle={() => toggle(cuisines, setCuisines, c)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Dietary needs</h2>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((d) => (
              <ToggleChip key={d} label={d} selected={diets.includes(d)} onToggle={() => toggle(diets, setDiets, d)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Vibes</h2>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((v) => (
              <ToggleChip key={v} label={v} selected={vibes.includes(v)} onToggle={() => toggle(vibes, setVibes, v)} />
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {saved && <p className="text-green-600 text-sm">Saved!</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </form>
    </div>
  )
}
