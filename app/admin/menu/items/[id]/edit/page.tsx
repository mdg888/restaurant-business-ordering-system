import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import MenuItemForm from '@/components/admin/MenuItemForm'

export default async function EditMenuItemPage({ params }: PageProps<'/admin/menu/items/[id]/edit'>) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: item }, { data: categories }, { data: modifiers }] = await Promise.all([
    supabase.from('menu_items').select('*').eq('id', id).single(),
    supabase.from('menu_categories').select('id, name').order('sort_order'),
    supabase.from('menu_item_modifiers').select('*').eq('menu_item_id', id).order('name'),
  ])

  if (!item) notFound()

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/menu" className="hover:text-orange-500 transition-colors">Menu</Link>
        <span>/</span>
        <span className="text-gray-700">Edit Item</span>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Menu Item</h1>
      <MenuItemForm item={item} categories={categories ?? []} modifiers={modifiers ?? []} />
    </div>
  )
}
