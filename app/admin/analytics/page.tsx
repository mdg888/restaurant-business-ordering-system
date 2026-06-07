import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import StatCard from '@/components/admin/analytics/StatCard'
import RevenueChart from '@/components/admin/analytics/RevenueChart'
import TopItemsChart from '@/components/admin/analytics/TopItemsChart'
import OrderVolumeChart from '@/components/admin/analytics/OrderVolumeChart'

export default async function AdminAnalyticsPage() {
  const supabase = createServiceClient()

  const [
    { data: paidOrders },
    { data: allOrders },
    { data: orderItems },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, created_at, user_id')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, payment_status, order_status, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('order_items')
      .select('name, quantity, unit_price, order_id'),
  ])

  const paid = paidOrders ?? []
  const all = allOrders ?? []
  const items = orderItems ?? []

  // Revenue stats
  const totalRevenue = paid.reduce((sum, o) => sum + o.total_amount, 0)
  const avgOrderValue = paid.length ? Math.round(totalRevenue / paid.length) : 0
  const refundedCount = all.filter((o) => o.payment_status === 'refunded').length
  const refundRate = paid.length ? ((refundedCount / (paid.length + refundedCount)) * 100).toFixed(1) : '0'

  // Unique customers
  const uniqueCustomers = new Set(paid.filter((o) => o.user_id).map((o) => o.user_id)).size

  // Revenue by day (last 30 days)
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const revenueByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    revenueByDay[d.toISOString().slice(0, 10)] = 0
  }
  paid.forEach((o) => {
    const day = o.created_at.slice(0, 10)
    if (day in revenueByDay) revenueByDay[day] += o.total_amount
  })
  const revenueChartData = Object.entries(revenueByDay).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    amount,
  }))

  // Order volume by day
  const volumeByDay: Record<string, number> = {}
  Object.keys(revenueByDay).forEach((d) => { volumeByDay[d] = 0 })
  all.forEach((o) => {
    const day = o.created_at.slice(0, 10)
    if (day in volumeByDay) volumeByDay[day] += 1
  })
  const volumeChartData = Object.entries(volumeByDay).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    count,
  }))

  // Top items by quantity
  const itemTotals: Record<string, { qty: number; revenue: number }> = {}
  items.forEach((item) => {
    if (!itemTotals[item.name]) itemTotals[item.name] = { qty: 0, revenue: 0 }
    itemTotals[item.name].qty += item.quantity
    itemTotals[item.name].revenue += item.unit_price * item.quantity
  })
  const topItems = Object.entries(itemTotals)
    .map(([name, { qty, revenue }]) => ({ name, qty, revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  // Order status breakdown
  const statusCounts = all.reduce<Record<string, number>>((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={formatPrice(totalRevenue)} sub="all paid orders" />
        <StatCard label="Total Orders" value={String(paid.length)} sub={`${refundRate}% refund rate`} />
        <StatCard label="Avg Order Value" value={formatPrice(avgOrderValue)} sub="paid orders" />
        <StatCard label="Unique Customers" value={String(uniqueCustomers)} sub="logged-in only" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Revenue — Last 30 Days</h2>
        <RevenueChart data={revenueChartData} />
      </div>

      {/* Order volume chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Volume — Last 30 Days</h2>
        <OrderVolumeChart data={volumeChartData} />
      </div>

      {/* Top items + status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Items by Quantity</h2>
          <TopItemsChart data={topItems} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Orders by Status</h2>
          <div className="flex flex-col gap-3 mt-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-700">{status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-orange-400"
                      style={{ width: `${Math.round((count / all.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
