'use client'

import { useState } from 'react'
import type { MenuCategory, MenuItem, MenuItemModifier } from '@/lib/supabase/types'
import MenuItemCard from './MenuItemCard'

type ItemWithModifiers = MenuItem & { menu_item_modifiers: MenuItemModifier[] }

interface Props {
  categories: MenuCategory[]
  items: ItemWithModifiers[]
}

export default function MenuClient({ categories, items }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory
    ? items.filter((i) => i.category_id === activeCategory)
    : items

  return (
    <div>
      {/* Category filter tabs */}
      <div className="flex gap-3 flex-wrap mb-10">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {categories
        .filter((cat) => !activeCategory || cat.id === activeCategory)
        .map((cat) => {
          const catItems = filtered.filter((i) => i.category_id === cat.id)
          if (catItems.length === 0) return null
          return (
            <div key={cat.id} className="mb-14">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">{cat.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
