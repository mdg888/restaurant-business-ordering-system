import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartModifier {
  id: string
  name: string
  price_cents: number
}

export interface CartItem {
  id: string                // unique cart line id (menu_item_id + modifier combo)
  menu_item_id: string
  name: string
  quantity: number
  unit_price: number        // base price in cents
  modifiers: CartModifier[]
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalCents: () => number
  totalItems: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = `${item.menu_item_id}-${item.modifiers.map(m => m.id).sort().join('-')}`
        set((state) => {
          const existing = state.items.find((i) => i.id === id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, id }] }
        })
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }))
      },

      clearCart: () => set({ items: [] }),

      totalCents: () =>
        get().items.reduce((sum, item) => {
          const modifierTotal = item.modifiers.reduce((s, m) => s + m.price_cents, 0)
          return sum + (item.unit_price + modifierTotal) * item.quantity
        }, 0),

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
)
