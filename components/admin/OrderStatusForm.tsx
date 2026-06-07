'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Order } from '@/lib/supabase/types'

export default function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: Order['order_status']
}) {
  const router = useRouter()
  const [status, setStatus] = useState<Order['order_status']>(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === currentStatus) return
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: status }),
    })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to update')
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as Order['order_status'])}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
      >
        <option value="placed">Placed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button
        type="submit"
        disabled={loading || status === currentStatus}
        className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  )
}
