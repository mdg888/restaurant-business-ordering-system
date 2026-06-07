'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import type { MenuItem, MenuItemModifier } from '@/lib/supabase/types'

type CategoryOption = { id: string; name: string }

interface Props {
  item?: MenuItem
  categories: CategoryOption[]
  modifiers?: MenuItemModifier[]
}

export default function MenuItemForm({ item, categories, modifiers: initialModifiers = [] }: Props) {
  const router = useRouter()
  const isEdit = !!item

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [priceDollars, setPriceDollars] = useState(
    item ? (item.price_cents / 100).toFixed(2) : ''
  )
  const [categoryId, setCategoryId] = useState(item?.category_id ?? '')
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '')
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? 0))
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modifiers state
  const [modifiers, setModifiers] = useState<Array<Partial<MenuItemModifier> & { _new?: boolean; _deleted?: boolean }>>(
    initialModifiers.map((m) => ({ ...m }))
  )
  const [newModName, setNewModName] = useState('')
  const [newModPrice, setNewModPrice] = useState('')

  function addModifier() {
    if (!newModName.trim()) return
    const priceCents = Math.round(parseFloat(newModPrice || '0') * 100)
    setModifiers((prev) => [...prev, { name: newModName.trim(), price_cents: priceCents, is_available: true, _new: true }])
    setNewModName('')
    setNewModPrice('')
  }

  function removeModifier(idx: number) {
    setModifiers((prev) =>
      prev[idx]._new
        ? prev.filter((_, i) => i !== idx)
        : prev.map((m, i) => (i === idx ? { ...m, _deleted: true } : m))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!categoryId) { setError('Category is required'); return }
    const priceCents = Math.round(parseFloat(priceDollars) * 100)
    if (!priceCents || priceCents <= 0) { setError('Price must be greater than $0.00'); return }

    setLoading(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price_cents: priceCents,
      category_id: categoryId,
      image_url: imageUrl.trim() || null,
      sort_order: parseInt(sortOrder, 10) || 0,
      is_available: isAvailable,
    }

    const res = isEdit
      ? await fetch(`/api/admin/menu/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/menu/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to save item')
      setLoading(false)
      return
    }

    const { id: savedId } = await res.json()
    const itemId = isEdit ? item.id : savedId

    // Sync modifiers
    for (const mod of modifiers) {
      if (mod._new && !mod._deleted) {
        await fetch('/api/admin/menu/modifiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menu_item_id: itemId, name: mod.name, price_cents: mod.price_cents ?? 0, is_available: mod.is_available ?? true }),
        })
      } else if (mod._deleted && mod.id) {
        await fetch(`/api/admin/menu/modifiers/${mod.id}`, { method: 'DELETE' })
      } else if (mod.id && !mod._new) {
        await fetch(`/api/admin/menu/modifiers/${mod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mod.name, price_cents: mod.price_cents, is_available: mod.is_available }),
        })
      }
    }

    router.push('/admin/menu')
    router.refresh()
    setLoading(false)
  }

  async function handleDelete() {
    if (!item) return
    if (!confirm('Delete this menu item?')) return
    setLoading(true)
    const res = await fetch(`/api/admin/menu/items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to delete')
      setLoading(false)
    } else {
      router.push('/admin/menu')
      router.refresh()
    }
  }

  const visibleModifiers = modifiers.filter((m) => !m._deleted)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (AUD) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          placeholder="https://…"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <label className="text-sm font-medium text-gray-700">Available</label>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="w-4 h-4 accent-orange-500"
          />
        </div>
      </div>

      {/* Modifiers */}
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Modifiers (Add-ons)</h3>

        {visibleModifiers.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {visibleModifiers.map((mod, idx) => {
              const realIdx = modifiers.indexOf(mod)
              return (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={mod.name ?? ''}
                    onChange={(e) => setModifiers((prev) => prev.map((m, i) => i === realIdx ? { ...m, name: e.target.value } : m))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={((mod.price_cents ?? 0) / 100).toFixed(2)}
                      onChange={(e) => setModifiers((prev) => prev.map((m, i) => i === realIdx ? { ...m, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) } : m))}
                      className="w-24 border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeModifier(realIdx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={newModName}
            onChange={(e) => setNewModName(e.target.value)}
            placeholder="Add-on name…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModifier() } }}
          />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newModPrice}
              onChange={(e) => setNewModPrice(e.target.value)}
              className="w-24 border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
              placeholder="0.00"
            />
          </div>
          <button
            type="button"
            onClick={addModifier}
            className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-700 transition-colors"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40"
        >
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Item'}
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
