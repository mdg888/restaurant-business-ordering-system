import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/supabase/types'

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

const PAGE_SIZE = 20

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<'/admin/orders'>) {
  const { order_status, payment_status, q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt((pageStr as string) ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = createServiceClient()
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (order_status) query = query.eq('order_status', order_status as Order['order_status'])
  if (payment_status) query = query.eq('payment_status', payment_status as Order['payment_status'])
  if (q) query = query.ilike('customer_email', `%${q}%`)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildUrl = (params: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (order_status) sp.set('order_status', order_status as string)
    if (payment_status) sp.set('payment_status', payment_status as string)
    if (q) sp.set('q', q as string)
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); else sp.delete(k) })
    const s = sp.toString()
    return `/admin/orders${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Orders</h1>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={q as string}
          placeholder="Search email…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
        />
        <select
          name="order_status"
          defaultValue={(order_status as string) ?? ''}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
        >
          <option value="">All statuses</option>
          <option value="placed">Placed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          name="payment_status"
          defaultValue={(payment_status as string) ?? ''}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
        >
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          type="submit"
          className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Filter
        </button>
        <Link
          href="/admin/orders"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center transition-colors"
        >
          Clear
        </Link>
      </form>

      {/* Mobile: card list */}
      <div className="sm:hidden flex flex-col gap-3">
        {!orders || orders.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No orders found</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</span>
                <span className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate mb-2">{order.customer_email ?? 'Guest'}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLOUR[order.payment_status] ?? ''}`}>
                    {order.payment_status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOUR[order.order_status] ?? ''}`}>
                    {order.order_status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{formatPrice(order.total_amount)}</span>
                  <Link href={`/admin/orders/${order.id}`} className="text-orange-500 hover:underline text-xs font-medium">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!orders || orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{order.customer_email ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLOUR[order.payment_status] ?? ''}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOUR[order.order_status] ?? ''}`}>
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(order.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-orange-500 hover:underline text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 justify-end">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="text-sm text-orange-500 hover:underline">
              ← Prev
            </Link>
          )}
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="text-sm text-orange-500 hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
