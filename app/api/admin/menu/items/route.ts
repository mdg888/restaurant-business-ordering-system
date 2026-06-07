import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return !!profile?.is_admin
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })
  if (!body.category_id) return Response.json({ error: 'Category is required' }, { status: 400 })
  if (!body.price_cents || body.price_cents <= 0) return Response.json({ error: 'Price must be > 0' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('menu_items')
    .insert({
      name: body.name.trim(),
      description: body.description ?? null,
      price_cents: body.price_cents,
      category_id: body.category_id,
      image_url: body.image_url ?? null,
      sort_order: body.sort_order ?? 0,
      is_available: body.is_available ?? true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
