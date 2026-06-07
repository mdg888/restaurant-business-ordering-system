-- ============================================================
-- MIGRATION 001: Initial Schema
-- ============================================================

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  is_admin    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- MENU CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- MENU ITEMS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  image_url       text,
  is_available    boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- MENU ITEM MODIFIERS (add-ons)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_modifiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  name            text NOT NULL,
  price_cents     integer DEFAULT 0 CHECK (price_cents >= 0),
  is_available    boolean DEFAULT true
);

-- ─────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable = guest
  items               jsonb NOT NULL DEFAULT '[]',
  total_amount        integer NOT NULL CHECK (total_amount >= 0),         -- cents
  payment_status      text NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'paid', 'failed')),
  order_status        text NOT NULL DEFAULT 'placed'
                        CHECK (order_status IN ('placed', 'completed', 'cancelled')),
  stripe_session_id   text UNIQUE NOT NULL,
  customer_email      text,   -- captured from Stripe for guest orders
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- ORDER ITEMS (denormalized snapshot)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name            text NOT NULL,       -- snapshot at order time
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      integer NOT NULL,    -- snapshot in cents
  modifiers       jsonb DEFAULT '[]'
);

-- ─────────────────────────────────────────
-- LOYALTY ACCOUNTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points    integer DEFAULT 0 CHECK (total_points >= 0),
  updated_at      timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- LOYALTY TRANSACTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  points      integer NOT NULL,
  type        text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment')),
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- EMAIL LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  to_email    text NOT NULL,
  type        text NOT NULL CHECK (type IN ('order_created', 'payment_success', 'order_completed', 'order_cancelled')),
  status      text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error       text,
  created_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment     ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_user    ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order   ON email_logs(order_id);
