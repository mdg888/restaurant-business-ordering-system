import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function GET() {
  const service = createServiceClient()
  const { data, error } = await service.from('menu_categories').select('*').order('sort_order')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('menu_categories')
    .insert({ name: body.name.trim(), sort_order: body.sort_order ?? 0, is_active: body.is_active ?? true })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
