export interface CartItem {
  menu_item_id: string
  name: string
  quantity: number
  unit_price: number       // cents — must be verified server-side
  modifiers: CartModifier[]
}

export interface CartModifier {
  id: string
  name: string
  price_cents: number
}

export interface CheckoutRequest {
  items: CartItem[]
  user_id?: string         // optional — guest if omitted
}
