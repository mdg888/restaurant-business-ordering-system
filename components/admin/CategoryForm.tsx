'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MenuCategory } from '@/lib/supabase/types'

export default function CategoryForm({ category }: { category?: MenuCategory }) {
  const router = useRouter()
  const isEdit = !!category

  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0))
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError(null)

    const payload = { name: name.trim(), sort_order: parseInt(sortOrder, 10) || 0, is_active: isActive }
    const res = isEdit
      ? await fetch(`/api/admin/menu/categories/${category.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/menu/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to save')
    } else {
      router.push('/admin/menu')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!category) return
    if (!confirm('Delete this category? Items in it will lose their category.')) return
    setLoading(true)
    const res = await fetch(`/api/admin/menu/categories/${category.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to delete')
      setLoading(false)
    } else {
      router.push('/admin/menu')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          placeholder="e.g. Burgers"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Active</label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-orange-500"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40"
        >
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
