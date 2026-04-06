const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// --- Auth ---
export interface AuthResponse {
  access_token: string
  token_type: string
  user_id: string
}

export const auth = {
  signup: (email: string, password: string, name?: string) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
}

// --- Users ---
export interface Preferences {
  id: string
  user_id: string
  cuisines: string[]
  diets: string[]
  vibes: string[]
}

export interface User {
  id: string
  email: string
  name: string | null
  city: string | null
  budget: string | null
  bio: string | null
  created_at: string
  preferences: Preferences | null
}

export const users = {
  me: () => request<User>('/users/me'),
  updateMe: (data: Partial<Pick<User, 'name' | 'city' | 'budget' | 'bio'>>) =>
    request<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  getPreferences: () => request<Preferences>('/users/me/preferences'),
  updatePreferences: (data: { cuisines?: string[]; diets?: string[]; vibes?: string[] }) =>
    request<Preferences>('/users/me/preferences', { method: 'PUT', body: JSON.stringify(data) }),
}

// --- Groups ---
export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string | null
  invite_code: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export const groups = {
  create: (name: string, description?: string) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
  list: () => request<Group[]>('/groups'),
  get: (id: string) => request<Group>(`/groups/${id}`),
  members: (id: string) => request<GroupMember[]>(`/groups/${id}/members`),
  join: (invite_code: string) =>
    request<GroupMember>('/groups/join', { method: 'POST', body: JSON.stringify({ invite_code }) }),
  delete: (id: string) => request<void>(`/groups/${id}`, { method: 'DELETE' }),
}

// --- Sessions ---
export interface DinnerSession {
  id: string
  group_id: string
  title: string
  city: string
  status: 'open' | 'closed'
  created_at: string
}

export interface Vote {
  id: string
  session_id: string
  user_id: string
  restaurant_name: string
  score: number
}

export interface RestaurantResult {
  restaurant_name: string
  average_score: number
  vote_count: number
}

export interface SessionResults {
  session_id: string
  results: RestaurantResult[]
}

export interface SessionRestaurant {
  id: string
  session_id: string
  name: string
  cuisine: string | null
  price_range: string | null
  address: string | null
  vibe: string | null
  source: 'ai' | 'manual'
  added_by: string | null
  created_at: string
}

export const sessions = {
  create: (group_id: string, title: string, city: string) =>
    request<DinnerSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ group_id, title, city }),
    }),
  listForGroup: (group_id: string) =>
    request<DinnerSession[]>(`/sessions/group/${group_id}`),
  get: (id: string) => request<DinnerSession>(`/sessions/${id}`),
  vote: (session_id: string, restaurant_name: string, score: number) =>
    request<Vote>(`/sessions/${session_id}/votes`, {
      method: 'POST',
      body: JSON.stringify({ restaurant_name, score }),
    }),
  votes: (session_id: string) => request<Vote[]>(`/sessions/${session_id}/votes`),
  results: (session_id: string) => request<SessionResults>(`/sessions/${session_id}/results`),
  restaurants: (session_id: string) =>
    request<SessionRestaurant[]>(`/sessions/${session_id}/restaurants`),
  addRestaurant: (
    session_id: string,
    data: { name: string; cuisine?: string; price_range?: string; address?: string; vibe?: string }
  ) =>
    request<SessionRestaurant>(`/sessions/${session_id}/restaurants`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// --- Recommendations ---
export interface Restaurant {
  name: string
  cuisine: string
  price_range: '$' | '$$' | '$$$' | '$$$$'
  vibe: string
  why: string
  address?: string
}

export interface RecommendationResult {
  recommendations: Restaurant[]
  summary: string
}

export interface Recommendation {
  id: string
  user_id: string
  session_id: string | null
  city: string
  result: RecommendationResult
  created_at: string
}

export const recommendations = {
  generate: (city: string, session_id?: string) =>
    request<Recommendation>('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ city, session_id }),
    }),
  get: (id: string) => request<Recommendation>(`/recommendations/${id}`),
}

// --- Places ---
export interface PlaceResult {
  name: string
  address: string | null
  rating: number | null
  price_range: string | null
  cuisine: string | null
  maps_url: string | null
  website: string | null
}

export const places = {
  search: (location: string, cuisines?: string[], diets?: string[]) => {
    const params = new URLSearchParams({ location })
    if (cuisines?.length) params.set('cuisines', cuisines.join(','))
    if (diets?.length) params.set('diets', diets.join(','))
    return request<{ results: PlaceResult[]; cached: boolean }>(`/places/search?${params}`)
  },
}

// --- Feedback ---
export const feedback = {
  submit: (type: 'bug' | 'feature', message: string) =>
    request<{ id: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ type, message }),
    }),
}
