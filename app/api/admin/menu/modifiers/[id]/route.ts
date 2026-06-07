import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return !!profile?.is_admin
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/admin/menu/modifiers/[id]'>) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const body = await req.json()

  const service = createServiceClient()
  const { error } = await service.from('menu_item_modifiers').update(body).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/admin/menu/modifiers/[id]'>) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const service = createServiceClient()
  const { error } = await service.from('menu_item_modifiers').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
