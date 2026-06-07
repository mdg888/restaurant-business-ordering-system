import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import { formatPrice } from '@/lib/utils'
import { Star, LogOut } from 'lucide-react'

export default async function AccountPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: orders }, { data: loyalty }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('loyalty_accounts').select('*').eq('user_id', user.id).single(),
  ])

  const statusColour: Record<string, string> = {
    placed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const paymentColour: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name ?? 'My Account'}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>

        {/* Loyalty */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-500 rounded-full p-3">
              <Star size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Loyalty Stamps</p>
              <p className="text-3xl font-bold text-orange-600">
                {loyalty?.stamp_count ?? 0}
                <span className="text-base font-normal text-orange-500 ml-1">stamps</span>
              </p>
              <p className="text-xs text-orange-500 mt-0.5">
                Every 10 orders earns a free order
              </p>
            </div>
          </div>

          {/* Stamp card */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  i < ((loyalty?.stamp_count ?? 0) % 10)
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-orange-300 bg-white text-orange-300'
                }`}
              >
                ★
              </div>
            ))}
          </div>

          {(loyalty?.free_orders_available ?? 0) > 0 ? (
            <p className="text-sm font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-2">
              🎉 You have {loyalty!.free_orders_available} free order{loyalty!.free_orders_available > 1 ? 's' : ''} to redeem at checkout!
            </p>
          ) : (
            <p className="text-xs text-orange-500">
              {10 - ((loyalty?.stamp_count ?? 0) % 10)} more order{10 - ((loyalty?.stamp_count ?? 0) % 10) !== 1 ? 's' : ''} until your next free order
            </p>
          )}
        </div>

        {/* Order history */}
        <h2 className="text-xl font-semibold mb-4">Order History</h2>

        {!orders || orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-3">No orders yet</p>
            <Link
              href="/menu"
              className="text-orange-500 hover:underline font-medium text-sm"
            >
              Browse the menu
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColour[order.order_status] ?? ''}`}>
                      {order.order_status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentColour[order.payment_status] ?? ''}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-gray-100 pt-3 flex flex-col gap-1">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-gray-500">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-orange-600">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
