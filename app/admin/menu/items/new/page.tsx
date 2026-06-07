import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import MenuItemForm from '@/components/admin/MenuItemForm'

export default async function NewMenuItemPage() {
  const supabase = createServiceClient()
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/menu" className="hover:text-orange-500 transition-colors">Menu</Link>
        <span>/</span>
        <span className="text-gray-700">New Item</span>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Menu Item</h1>
      <MenuItemForm categories={categories ?? []} />
    </div>
  )
}
