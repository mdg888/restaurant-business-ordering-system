import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Star } from 'lucide-react'
import AdjustmentForm from '@/components/admin/AdjustmentForm'

const TYPE_COLOUR: Record<string, string> = {
  earn: 'bg-green-100 text-green-700',
  redeem: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-orange-100 text-orange-700',
}

export default async function AdminLoyaltyUserPage({ params }: PageProps<'/admin/loyalty/[userId]'>) {
  const { userId } = await params
  const supabase = createServiceClient()

  const [{ data: profile }, { data: account }, { data: transactions }] = await Promise.all([
    supabase.from('profiles').select('email, full_name').eq('id', userId).single(),
    supabase.from('loyalty_accounts').select('*').eq('user_id', userId).single(),
    supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!profile) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
        <Link href="/admin/loyalty" className="hover:text-orange-500 transition-colors">Loyalty</Link>
        <span>/</span>
        <span className="text-gray-700">{profile.full_name ?? profile.email}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name ?? 'Customer'}</h1>
          <p className="text-gray-400 text-sm mt-1">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <Star size={20} className="fill-orange-400 text-orange-400" />
          <span className="text-2xl font-bold text-orange-600">{account?.total_points ?? 0}</span>
          <span className="text-sm text-orange-500">pts</span>
        </div>
      </div>

      {/* Manual adjustment */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Manual Adjustment</h2>
        <AdjustmentForm userId={userId} />
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Transaction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Order</th>
            </tr>
          </thead>
          <tbody>
            {!transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(tx.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOUR[tx.type] ?? ''}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className={tx.points >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tx.note ?? '—'}</td>
                  <td className="px-4 py-3">
                    {tx.order_id ? (
                      <Link
                        href={`/admin/orders/${tx.order_id}`}
                        className="text-orange-500 hover:underline text-xs font-mono"
                      >
                        #{tx.order_id.slice(0, 8).toUpperCase()}
                      </Link>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
