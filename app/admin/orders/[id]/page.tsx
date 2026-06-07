import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice, gstAmount, exGst } from '@/lib/utils'
import OrderStatusForm from '@/components/admin/OrderStatusForm'

const STATUS_COLOUR: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const PAYMENT_COLOUR: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

export default async function AdminOrderDetailPage({ params }: PageProps<'/admin/orders/[id]'>) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: order }, { data: orderItems }, { data: emailLogs }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('email_logs').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ])

  if (!order) notFound()

  let loyaltyPoints: number | null = null
  if (order.user_id) {
    const { data: lt } = await supabase
      .from('loyalty_transactions')
      .select('points')
      .eq('order_id', id)
      .eq('type', 'earn')
      .single()
    loyaltyPoints = lt?.points ?? null
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/orders" className="hover:text-orange-500 transition-colors">Orders</Link>
        <span>/</span>
        <span className="text-gray-700 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono">#{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(order.created_at).toLocaleDateString('en-AU', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_COLOUR[order.payment_status] ?? ''}`}>
            {order.payment_status}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOUR[order.order_status] ?? ''}`}>
            {order.order_status}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h2>
        <p className="text-gray-800">{order.customer_email ?? 'Guest'}</p>
        {order.user_id && (
          <p className="text-xs text-gray-400 font-mono mt-1">{order.user_id}</p>
        )}
        {loyaltyPoints !== null && (
          <p className="text-sm text-orange-600 mt-2">+{loyaltyPoints} loyalty points earned</p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h2>
        <div className="flex flex-col gap-2">
          {orderItems?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span className="font-medium">{item.quantity}× {item.name}</span>
                {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {(item.modifiers as Array<{ name: string }>).map((m) => m.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="text-gray-600">{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (ex. GST)</span>
            <span>{formatPrice(exGst(order.total_amount))}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>GST (10%)</span>
            <span>{formatPrice(gstAmount(order.total_amount))}</span>
          </div>
          <div className="flex justify-between font-semibold text-base mt-1">
            <span>Total</span>
            <span className="text-orange-600">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Update status */}
      {order.order_status !== 'cancelled' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</h2>
          <OrderStatusForm orderId={order.id} currentStatus={order.order_status} />
        </div>
      )}

      {/* Email logs */}
      {emailLogs && emailLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Email Logs</h2>
          <div className="flex flex-col gap-2">
            {emailLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{log.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  log.status === 'sent' ? 'bg-green-100 text-green-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
