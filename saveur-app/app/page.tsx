import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight text-stone-900 mb-4">Saveur</h1>
        <p className="text-xl text-stone-600 mb-8">
          AI-powered restaurant recommendations for your group dinners. Stop arguing — let Claude decide.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl font-semibold hover:bg-stone-50 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  )
}
