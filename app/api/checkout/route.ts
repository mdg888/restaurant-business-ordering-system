import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import type { CheckoutRequest } from '@/lib/stripe/types'

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest & { free_order?: boolean } = await request.json()
    const { items, user_id, free_order } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── Re-validate all prices from the database (never trust client) ──
    const menuItemIds = items.map((i) => i.menu_item_id)
    const { data: dbItems, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, price_cents, is_available')
      .in('id', menuItemIds)

    if (itemsError || !dbItems) {
      return NextResponse.json({ error: 'Failed to validate items' }, { status: 500 })
    }

    const dbItemMap = new Map(dbItems.map((i) => [i.id, i]))

    // Build verified line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let totalCents = 0

    for (const cartItem of items) {
      const dbItem = dbItemMap.get(cartItem.menu_item_id)

      if (!dbItem) {
        return NextResponse.json(
          { error: `Item not found: ${cartItem.menu_item_id}` },
          { status: 400 }
        )
      }
      if (!dbItem.is_available) {
        return NextResponse.json(
          { error: `Item no longer available: ${dbItem.name}` },
          { status: 400 }
        )
      }

      // Validate modifier prices if any
      let modifierTotal = 0
      if (cartItem.modifiers?.length > 0) {
        const modifierIds = cartItem.modifiers.map((m) => m.id)
        const { data: dbModifiers } = await supabase
          .from('menu_item_modifiers')
          .select('id, price_cents, is_available')
          .in('id', modifierIds)
          .eq('menu_item_id', cartItem.menu_item_id)

        if (dbModifiers) {
          for (const mod of dbModifiers) {
            if (!mod.is_available) {
              return NextResponse.json(
                { error: `Modifier no longer available` },
                { status: 400 }
              )
            }
            modifierTotal += mod.price_cents
          }
        }
      }

      const verifiedUnitPrice = dbItem.price_cents + modifierTotal
      const itemTotal = verifiedUnitPrice * cartItem.quantity
      totalCents += itemTotal

      const modifierNames = cartItem.modifiers?.map((m) => m.name).join(', ')
      const itemName = modifierNames
        ? `${dbItem.name} (${modifierNames})`
        : dbItem.name

      lineItems.push({
        price_data: {
          currency: 'aud' as const,
          product_data: { name: itemName },
          unit_amount: verifiedUnitPrice,
        },
        quantity: cartItem.quantity,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // ── Create 100% coupon if redeeming free order ──
    let discounts: Stripe.Checkout.SessionCreateParams['discounts'] = undefined
    if (free_order && user_id) {
      const coupon = await stripe.coupons.create({
        percent_off: 100,
        duration: 'once',
        name: 'Free Order Reward',
      })
      discounts = [{ coupon: coupon.id }]
    }

    // ── Create Stripe Checkout Session ──
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/menu`,
      customer_creation: 'always',
      discounts,
      metadata: {
        user_id: user_id ?? '',
        free_order: free_order ? 'true' : 'false',
        items: JSON.stringify(
          items.map((i) => ({
            menu_item_id: i.menu_item_id,
            name: i.name,
            quantity: i.quantity,
            unit_price: dbItemMap.get(i.menu_item_id)!.price_cents,
            modifiers: i.modifiers ?? [],
          }))
        ),
        total_amount: String(totalCents),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
