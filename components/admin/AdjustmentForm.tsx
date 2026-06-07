'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdjustmentForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(points, 10)
    if (isNaN(pts) || pts === 0) { setError('Enter a non-zero integer'); return }
    if (!note.trim()) { setError('Note/reason is required'); return }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch(`/api/admin/loyalty/${userId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: pts, note: note.trim() }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to adjust')
    } else {
      setSuccess(`${pts > 0 ? '+' : ''}${pts} points applied`)
      setPoints('')
      setNote('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="e.g. +50 or -20"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Goodwill gesture for delayed order"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40"
        >
          {loading ? 'Applying…' : 'Apply Adjustment'}
        </button>
      </div>
    </form>
  )
}
