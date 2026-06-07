'use client'

import { useState } from 'react'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/store/cart'
import { formatPrice } from '@/lib/utils'
import type { MenuItem, MenuItemModifier } from '@/lib/supabase/types'

type ItemWithModifiers = MenuItem & { menu_item_modifiers: MenuItemModifier[] }

export default function MenuItemCard({ item }: { item: ItemWithModifiers }) {
  const addItem = useCart((s) => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<MenuItemModifier[]>([])
  const [added, setAdded] = useState(false)

  const modifiers = item.menu_item_modifiers?.filter((m) => m.is_available) ?? []

  const toggleModifier = (mod: MenuItemModifier) => {
    setSelectedModifiers((prev) =>
      prev.find((m) => m.id === mod.id)
        ? prev.filter((m) => m.id !== mod.id)
        : [...prev, mod]
    )
  }

  const modifierTotal = selectedModifiers.reduce((s, m) => s + m.price_cents, 0)
  const lineTotal = (item.price_cents + modifierTotal) * quantity

  const handleAdd = () => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      quantity,
      unit_price: item.price_cents,
      modifiers: selectedModifiers.map((m) => ({
        id: m.id,
        name: m.name,
        price_cents: m.price_cents,
      })),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    setQuantity(1)
    setSelectedModifiers([])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Item info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{item.name}</h3>
          <span className="text-orange-600 font-semibold whitespace-nowrap">
            {formatPrice(item.price_cents)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        )}
      </div>

      {/* Modifiers */}
      {modifiers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Add-ons</p>
          <div className="flex flex-wrap gap-2">
            {modifiers.map((mod) => (
              <button
                key={mod.id}
                onClick={() => toggleModifier(mod)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedModifiers.find((m) => m.id === mod.id)
                    ? 'bg-orange-100 border-orange-400 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                {mod.name} {mod.price_cents > 0 && `+${formatPrice(mod.price_cents)}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity + Add */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={handleAdd}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            added
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          <ShoppingCart size={14} />
          {added ? 'Added!' : `Add ${formatPrice(lineTotal)}`}
        </button>
      </div>
    </div>
  )
}
