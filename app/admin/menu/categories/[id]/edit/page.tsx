import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import CategoryForm from '@/components/admin/CategoryForm'

export default async function EditCategoryPage({ params }: PageProps<'/admin/menu/categories/[id]/edit'>) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: category } = await supabase.from('menu_categories').select('*').eq('id', id).single()
  if (!category) notFound()

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/menu" className="hover:text-orange-500 transition-colors">Menu</Link>
        <span>/</span>
        <span className="text-gray-700">Edit Category</span>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Category</h1>
      <CategoryForm category={category} />
    </div>
  )
}
