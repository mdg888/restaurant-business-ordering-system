import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil } from 'lucide-react'
import ToggleAvailability from '@/components/admin/ToggleAvailability'

export default async function AdminMenuPage() {
  const supabase = createServiceClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase
      .from('menu_items')
      .select('*, menu_item_modifiers(*)')
      .order('sort_order'),
  ])

  const itemsByCategory = (categories ?? []).map((cat) => ({
    ...cat,
    items: (items ?? []).filter((item) => item.category_id === cat.id),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/admin/menu/categories/new"
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Category</span>
          </Link>
          <Link
            href="/admin/menu/items/new"
            className="flex items-center gap-1.5 bg-orange-500 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Item</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {itemsByCategory.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cat.is_active ? 'Active' : 'Hidden'}
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">order: {cat.sort_order}</span>
              </div>
              <Link
                href={`/admin/menu/categories/${cat.id}/edit`}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              >
                <Pencil size={13} /> Edit
              </Link>
            </div>

            {cat.items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No items in this category</p>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden divide-y divide-gray-50">
                  {cat.items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatPrice(item.price_cents)}
                          {(item.menu_item_modifiers as unknown[])?.length > 0 && (
                            <span className="ml-2">{(item.menu_item_modifiers as unknown[]).length} modifiers</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ToggleAvailability id={item.id} type="item" available={item.is_available} />
                        <Link
                          href={`/admin/menu/items/${item.id}/edit`}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil size={15} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <table className="hidden sm:table w-full text-sm">
                  <tbody>
                    {cat.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate hidden lg:table-cell">{item.description}</td>
                        <td className="px-5 py-3 font-medium">{formatPrice(item.price_cents)}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">
                          {(item.menu_item_modifiers as unknown[])?.length ?? 0} modifiers
                        </td>
                        <td className="px-5 py-3">
                          <ToggleAvailability id={item.id} type="item" available={item.is_available} />
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/menu/items/${item.id}/edit`}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Pencil size={13} /> Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
