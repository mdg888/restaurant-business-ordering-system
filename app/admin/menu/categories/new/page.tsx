import CategoryForm from '@/components/admin/CategoryForm'
import Link from 'next/link'

export default function NewCategoryPage() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/menu" className="hover:text-orange-500 transition-colors">Menu</Link>
        <span>/</span>
        <span className="text-gray-700">New Category</span>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Category</h1>
      <CategoryForm />
    </div>
  )
}
