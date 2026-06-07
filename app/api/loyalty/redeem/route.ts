import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Atomically decrement free_orders_available
  const { data: redeemed, error } = await service.rpc('redeem_free_order', { p_user_id: user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!redeemed) return NextResponse.json({ error: 'No free orders available' }, { status: 400 })

  // Log the redemption
  await service.from('loyalty_transactions').insert({
    user_id: user.id,
    points: 0,
    type: 'redeem',
    note: 'Free order redeemed',
  })

  return NextResponse.json({ ok: true })
}
