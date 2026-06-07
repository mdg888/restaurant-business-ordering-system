export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          is_admin?: boolean
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          price_cents: number
          image_url: string | null
          is_available: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          price_cents: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          category_id?: string | null
          name?: string
          description?: string | null
          price_cents?: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      menu_item_modifiers: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          price_cents: number
          is_available: boolean
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          price_cents?: number
          is_available?: boolean
        }
        Update: {
          name?: string
          price_cents?: number
          is_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifiers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          items: Json
          total_amount: number
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          order_status: 'placed' | 'completed' | 'cancelled'
          stripe_session_id: string
          stripe_payment_intent_id: string | null
          customer_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          items: Json
          total_amount: number
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          order_status?: 'placed' | 'completed' | 'cancelled'
          stripe_session_id: string
          stripe_payment_intent_id?: string | null
          customer_email?: string | null
          created_at?: string
        }
        Update: {
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          order_status?: 'placed' | 'completed' | 'cancelled'
          stripe_payment_intent_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          name: string
          quantity: number
          unit_price: number
          modifiers: Json
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          name: string
          quantity: number
          unit_price: number
          modifiers?: Json
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      loyalty_accounts: {
        Row: {
          user_id: string
          total_points: number
          stamp_count: number
          free_orders_available: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_points?: number
          stamp_count?: number
          free_orders_available?: number
          updated_at?: string
        }
        Update: {
          total_points?: number
          stamp_count?: number
          free_orders_available?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          points: number
          type: 'earn' | 'redeem' | 'adjustment'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          points: number
          type: 'earn' | 'redeem' | 'adjustment'
          note?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      email_logs: {
        Row: {
          id: string
          user_id: string | null
          order_id: string | null
          to_email: string
          type: 'order_created' | 'payment_success' | 'order_completed' | 'order_cancelled'
          status: 'pending' | 'sent' | 'failed'
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          to_email: string
          type: 'order_created' | 'payment_success' | 'order_completed' | 'order_cancelled'
          status?: 'pending' | 'sent' | 'failed'
          error?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed'
          error?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      increment_loyalty_points: {
        Args: { p_user_id: string; p_points: number }
        Returns: undefined
      }
      add_loyalty_stamp: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      redeem_free_order: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type MenuItemModifier = Database['public']['Tables']['menu_item_modifiers']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type LoyaltyAccount = Database['public']['Tables']['loyalty_accounts']['Row']
export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row']
export type EmailLog = Database['public']['Tables']['email_logs']['Row']
