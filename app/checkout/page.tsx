'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ArrowLeft, ShoppingBag, Gift } from 'lucide-react'
import Navbar from '@/components/ui/Navbar'
import { useCart } from '@/lib/store/cart'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, totalCents, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeOrdersAvailable, setFreeOrdersAvailable] = useState(0)
  const [stampCount, setStampCount] = useState(0)
  const [redeemFree, setRedeemFree] = useState(false)

  useEffect(() => {
    async function fetchLoyalty() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('loyalty_accounts')
        .select('free_orders_available, stamp_count')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setFreeOrdersAvailable(data.free_orders_available ?? 0)
        setStampCount(data.stamp_count ?? 0)
      }
    }
    fetchLoyalty()
  }, [])

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // If redeeming free order, decrement first
      if (redeemFree && user) {
        const redeemRes = await fetch('/api/loyalty/redeem', { method: 'POST' })
        if (!redeemRes.ok) {
          const json = await redeemRes.json()
          setError(json.error ?? 'Failed to redeem free order')
          setLoading(false)
          return
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          user_id: user?.id ?? null,
          free_order: redeemFree && !!user,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        // Restore free order if checkout failed after redemption
        if (redeemFree && user) setFreeOrdersAvailable((n) => n + 1)
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

  const stampsToNext = 10 - (stampCount % 10)

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

        {/* Stamp progress / free order banner */}
        {stampCount > 0 && (
          <div className={`rounded-xl border p-4 mb-6 ${freeOrdersAvailable > 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            {freeOrdersAvailable > 0 ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Gift size={22} className="text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">You have a free order!</p>
                    <p className="text-sm text-green-600 mt-0.5">
                      {freeOrdersAvailable} free order{freeOrdersAvailable > 1 ? 's' : ''} available — this order will be 100% free
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRedeemFree((r) => !r)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    redeemFree
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {redeemFree ? '✓ Applied' : 'Redeem'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 ${
                        i < (stampCount % 10)
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-orange-300 bg-white'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-orange-700 font-medium">
                  {stampsToNext} more order{stampsToNext !== 1 ? 's' : ''} until a free order
                </p>
              </div>
            )}
          </div>
        )}

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
          {redeemFree && (
            <div className="flex justify-between items-center text-sm text-green-600 mb-3">
              <span>Free order discount</span>
              <span>−{formatPrice(totalCents())}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-lg font-bold border-t border-gray-100 pt-3">
            <span>Total (inc. GST)</span>
            <span className={redeemFree ? 'text-green-600' : 'text-orange-600'}>
              {redeemFree ? 'FREE' : formatPrice(totalCents())}
            </span>
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
          {loading ? 'Redirecting to payment...' : redeemFree ? 'Claim Free Order' : `Pay ${formatPrice(totalCents())}`}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment powered by Stripe
        </p>
      </main>
    </div>
  )
}
