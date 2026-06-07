'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ToggleAvailability({
  id,
  type,
  available,
}: {
  id: string
  type: 'item' | 'modifier' | 'category'
  available: boolean
}) {
  const [on, setOn] = useState(available)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const endpoint =
    type === 'item'
      ? `/api/admin/menu/items/${id}`
      : type === 'modifier'
      ? `/api/admin/menu/modifiers/${id}`
      : `/api/admin/menu/categories/${id}`

  const field = type === 'category' ? 'is_active' : 'is_available'

  async function toggle() {
    setLoading(true)
    const next = !on
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next }),
    })
    if (res.ok) {
      setOn(next)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${on ? 'bg-green-500' : 'bg-gray-300'}`}
      aria-label="Toggle availability"
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
