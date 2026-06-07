'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import Navbar from '@/components/ui/Navbar'
import { useCart } from '@/lib/store/cart'
import { formatPrice } from '@/lib/utils'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, totalCents, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      clearCart()
      router.push(data.url)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <ShoppingBag size={48} className="text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-600">Your cart is empty</h2>
          <Link
            href="/menu"
            className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Browse Menu
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <Link href="/menu" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} /> Back to menu
        </Link>

        <h1 className="text-2xl font-bold mb-6">Your Order</h1>

        {/* Cart items */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
          {items.map((item) => {
            const modifierTotal = item.modifiers.reduce((s, m) => s + m.price_cents, 0)
            const lineTotal = (item.unit_price + modifierTotal) * item.quantity
            return (
              <div key={item.id} className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.modifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">
                    {formatPrice(item.unit_price + modifierTotal)} each
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-3 ml-2">
                  <span className="font-semibold text-orange-600 w-16 text-right">
                    {formatPrice(lineTotal)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
            <span>Subtotal (ex. GST)</span>
            <span>{formatPrice(Math.round(totalCents() / 1.1))}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
            <span>GST (10%)</span>
            <span>{formatPrice(totalCents() - Math.round(totalCents() / 1.1))}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold border-t border-gray-100 pt-3">
            <span>Total (inc. GST)</span>
            <span className="text-orange-600">{formatPrice(totalCents())}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Redirecting to payment...' : `Pay ${formatPrice(totalCents())}`}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment powered by Stripe
        </p>
      </main>
    </div>
  )
}
