'use client'

import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { ShoppingCart, User, UtensilsCrossed } from 'lucide-react'

export default function Navbar() {
  const totalItems = useCart((s) => s.totalItems())

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/menu" className="flex items-center gap-2 font-bold text-lg text-orange-600">
          <UtensilsCrossed size={22} />
          The Restaurant
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/account" className="text-gray-600 hover:text-gray-900 transition-colors">
            <User size={22} />
          </Link>
          <Link href="/checkout" className="relative text-gray-600 hover:text-gray-900 transition-colors">
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
