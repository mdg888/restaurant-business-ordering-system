import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Gift } from 'lucide-react'

export default async function AdminLoyaltyPage() {
  const supabase = createServiceClient()

  const { data: accounts } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .order('stamp_count', { ascending: false })

  const userIds = (accounts ?? []).map((a) => a.user_id)

  const { data: profiles } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
    : { data: [] }

  const { data: lastTx } = userIds.length
    ? await supabase
        .from('loyalty_transactions')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastTxByUser = (lastTx ?? []).reduce<Record<string, string>>((acc, tx) => {
    if (!acc[tx.user_id]) acc[tx.user_id] = tx.created_at
    return acc
  }, {})

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Loyalty</h1>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Visits</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Free Orders</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!accounts || accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No loyalty accounts yet
                </td>
              </tr>
            ) : (
              accounts.map((account) => {
                const profile = profileMap[account.user_id]
                const lastDate = lastTxByUser[account.user_id]
                const stamps = account.stamp_count ?? 0
                const stampsInCycle = stamps % 10
                const freeOrders = account.free_orders_available ?? 0

                return (
                  <tr key={account.user_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{profile?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{profile?.email ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{stamps}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${i < stampsInCycle ? 'bg-orange-500' : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {stampsInCycle}/10
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {freeOrders > 0 ? (
                        <span className="flex items-center gap-1 text-green-700 font-semibold">
                          <Gift size={14} className="text-green-500" />
                          {freeOrders}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {lastDate
                        ? new Date(lastDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/loyalty/${account.user_id}`}
                        className="text-orange-500 hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-3">
        {!accounts || accounts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No loyalty accounts yet</p>
        ) : (
          accounts.map((account) => {
            const profile = profileMap[account.user_id]
            const lastDate = lastTxByUser[account.user_id]
            const stamps = account.stamp_count ?? 0
            const stampsInCycle = stamps % 10
            const freeOrders = account.free_orders_available ?? 0

            return (
              <div key={account.user_id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-800">{profile?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{profile?.email ?? '—'}</p>
                  </div>
                  <Link href={`/admin/loyalty/${account.user_id}`} className="text-orange-500 hover:underline text-xs font-medium">
                    View
                  </Link>
                </div>

                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${i < stampsInCycle ? 'bg-orange-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-800 font-semibold">{stamps} visits ({stampsInCycle}/10)</span>
                  {freeOrders > 0 && (
                    <span className="flex items-center gap-1 text-green-700 font-semibold text-xs">
                      <Gift size={13} /> {freeOrders} free
                    </span>
                  )}
                  {lastDate && (
                    <span className="text-gray-400 text-xs">
                      {new Date(lastDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
