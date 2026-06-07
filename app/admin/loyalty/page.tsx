import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Star } from 'lucide-react'

export default async function AdminLoyaltyPage() {
  const supabase = createServiceClient()

  const { data: accounts } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .order('total_points', { ascending: false })

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!accounts || accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No loyalty accounts yet
                </td>
              </tr>
            ) : (
              accounts.map((account) => {
                const profile = profileMap[account.user_id]
                const lastDate = lastTxByUser[account.user_id]
                return (
                  <tr key={account.user_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {profile?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{profile?.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-semibold text-orange-600">
                        <Star size={14} className="fill-orange-400 text-orange-400" />
                        {account.total_points}
                      </span>
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
    </div>
  )
}
