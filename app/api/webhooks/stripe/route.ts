import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import type Stripe from 'stripe'

type ServiceClient = SupabaseClient<Database>

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  // ── 1. Verify webhook signature ──
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 2. Route events ──
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[webhook] checkout.session.completed received')
        console.log('[webhook] payment_status:', session.payment_status)
        console.log('[webhook] metadata:', JSON.stringify(session.metadata))
        if (session.payment_status === 'paid') {
          await handleCheckoutComplete(session)
        } else {
          console.log('[webhook] skipping — payment_status is not paid')
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(charge)
        break
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error)
    // Return 200 to prevent Stripe retrying non-recoverable errors
    return NextResponse.json({ error: 'Handler failed' }, { status: 200 })
  }

  return NextResponse.json({ received: true })
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT COMPLETE
// ─────────────────────────────────────────────────────────────
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient()

  const stripeSessionId = session.id
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null
  const userId = session.metadata?.user_id?.trim() || null
  const customerEmail = session.customer_details?.email ?? null
  const totalAmount = session.amount_total ?? 0

  let items: object[] = []
  try {
    items = JSON.parse(session.metadata?.items ?? '[]')
  } catch {
    console.error('Failed to parse items metadata for session:', stripeSessionId)
    return
  }

  // ── Idempotency check ──
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .single()

  if (existingOrder) {
    console.log('Order already exists for session:', stripeSessionId)
    return
  }

  // ── Create order ──
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId || null,
      items: items as Json,
      total_amount: totalAmount,
      payment_status: 'paid',
      order_status: 'placed',
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
      customer_email: customerEmail,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Failed to create order:', orderError)
    throw new Error('Order creation failed')
  }

  const orderId = order.id

  // ── Create order_items snapshot ──
  const orderItems = (items as Array<{
    menu_item_id: string
    name: string
    quantity: number
    unit_price: number
    modifiers: Array<{ id: string; name: string; price_cents: number }>
  }>).map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    modifiers: item.modifiers ?? [],
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) console.error('Failed to create order items:', itemsError)

  // ── Award loyalty stamp ──
  if (userId) {
    await awardLoyaltyStamp(supabase, userId, orderId, totalAmount)
  }

  // ── Queue confirmation email ──
  await logEmail(supabase, {
    userId: userId || null,
    orderId,
    toEmail: customerEmail ?? '',
    type: 'order_created',
  })

  console.log(`Order ${orderId} created for session ${stripeSessionId}`)
}

// ─────────────────────────────────────────────────────────────
// REFUND
// ─────────────────────────────────────────────────────────────
async function handleRefund(charge: Stripe.Charge) {
  const supabase = createServiceClient()

  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null

  if (!paymentIntentId) {
    console.error('charge.refunded event has no payment_intent id')
    return
  }

  // Find the order by payment intent
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, payment_status, customer_email')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (findError || !order) {
    console.error('Order not found for payment_intent:', paymentIntentId)
    return
  }

  // Already refunded — idempotency
  if (order.payment_status === 'refunded') {
    console.log('Order already marked refunded:', order.id)
    return
  }

  // ── Update order status ──
  await supabase
    .from('orders')
    .update({ payment_status: 'refunded', order_status: 'cancelled' })
    .eq('id', order.id)

  // ── Reverse loyalty stamp ──
  if (order.user_id) {
    await reverseLoyaltyStamp(supabase, order.user_id, order.id, order.total_amount)
  }

  // ── Queue cancellation email ──
  if (order.customer_email) {
    await logEmail(supabase, {
      userId: order.user_id,
      orderId: order.id,
      toEmail: order.customer_email,
      type: 'order_cancelled',
    })
  }

  console.log(`Order ${order.id} marked as refunded`)
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function awardLoyaltyStamp(
  supabase: ServiceClient,
  userId: string,
  orderId: string,
  totalAmountCents: number
) {
  const points = Math.floor(totalAmountCents / 100)

  // Record transaction
  const { error: txError } = await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    order_id: orderId,
    points,
    type: 'earn',
    note: 'Order stamp earned',
  })
  if (txError) console.error('Failed to create loyalty transaction:', txError)

  // Add stamp — awards free order every 10
  const { error: stampError } = await supabase.rpc('add_loyalty_stamp', { p_user_id: userId })
  if (stampError) console.error('Failed to add loyalty stamp:', stampError)
}

async function reverseLoyaltyStamp(
  supabase: ServiceClient,
  userId: string,
  orderId: string,
  totalAmountCents: number
) {
  const points = Math.floor(totalAmountCents / 100)

  // Record reversal transaction
  await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    order_id: orderId,
    points: -points,
    type: 'adjustment',
    note: 'Stamp reversed due to refund',
  })

  // Decrement stamp count, floor at 0
  await supabase
    .from('loyalty_accounts')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  await supabase.rpc('increment_loyalty_points', { p_user_id: userId, p_points: -points })
}

async function logEmail(
  supabase: ServiceClient,
  params: {
    userId: string | null
    orderId: string
    toEmail: string
    type: 'order_created' | 'payment_success' | 'order_completed' | 'order_cancelled'
  }
) {
  if (!params.toEmail) return

  await supabase.from('email_logs').insert({
    user_id: params.userId,
    order_id: params.orderId,
    to_email: params.toEmail,
    type: params.type,
    status: 'pending',
  })
}
