import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Order } from '@/lib/supabase/types'

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/admin/orders/[id]'>) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowedStatuses: Order['order_status'][] = ['placed', 'completed', 'cancelled']
  if (!allowedStatuses.includes(body.order_status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('orders')
    .update({ order_status: body.order_status })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
