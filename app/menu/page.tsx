import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import MenuClient from '@/components/menu/MenuClient'

export const revalidate = 60

export default async function MenuPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: items } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_item_modifiers (*)
    `)
    .eq('is_available', true)
    .order('sort_order')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Our Menu</h1>
        <p className="text-gray-500 mb-10">Fresh food, made to order</p>
        <MenuClient categories={categories ?? []} items={items ?? []} />
      </main>
    </div>
  )
}
