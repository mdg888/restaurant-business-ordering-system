import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/admin/loyalty/[userId]/adjust'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await ctx.params
  const body = await req.json()
  const points = parseInt(body.points, 10)
  if (isNaN(points) || points === 0) return Response.json({ error: 'Invalid points' }, { status: 400 })
  if (!body.note?.trim()) return Response.json({ error: 'Note is required' }, { status: 400 })

  const service = createServiceClient()

  await service.rpc('increment_loyalty_points', { p_user_id: userId, p_points: points })

  await service.from('loyalty_transactions').insert({
    user_id: userId,
    points,
    type: 'adjustment',
    note: body.note.trim(),
  })

  return Response.json({ ok: true })
}
