-- ============================================================
-- MIGRATION 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs            ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- HELPER: is_admin()
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
CREATE POLICY "profiles: users read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: admin read all"
  ON profiles FOR SELECT
  USING (is_admin());

-- ─────────────────────────────────────────
-- MENU CATEGORIES — public read, admin write
-- ─────────────────────────────────────────
CREATE POLICY "menu_categories: public read active"
  ON menu_categories FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "menu_categories: admin insert"
  ON menu_categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "menu_categories: admin update"
  ON menu_categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "menu_categories: admin delete"
  ON menu_categories FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────
-- MENU ITEMS — public read available, admin write
-- ─────────────────────────────────────────
CREATE POLICY "menu_items: public read available"
  ON menu_items FOR SELECT
  USING (is_available = true OR is_admin());

CREATE POLICY "menu_items: admin insert"
  ON menu_items FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "menu_items: admin update"
  ON menu_items FOR UPDATE
  USING (is_admin());

CREATE POLICY "menu_items: admin delete"
  ON menu_items FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────
-- MENU ITEM MODIFIERS — public read, admin write
-- ─────────────────────────────────────────
CREATE POLICY "modifiers: public read available"
  ON menu_item_modifiers FOR SELECT
  USING (is_available = true OR is_admin());

CREATE POLICY "modifiers: admin insert"
  ON menu_item_modifiers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "modifiers: admin update"
  ON menu_item_modifiers FOR UPDATE
  USING (is_admin());

CREATE POLICY "modifiers: admin delete"
  ON menu_item_modifiers FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────
-- ORDERS
-- Users see own orders; guests can't query (order created server-side)
-- Service role (webhook) bypasses RLS entirely
-- ─────────────────────────────────────────
CREATE POLICY "orders: users read own"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders: admin read all"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "orders: admin update status"
  ON orders FOR UPDATE
  USING (is_admin());

-- INSERT is done server-side via service role key (webhook), no user policy needed

-- ─────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────
CREATE POLICY "order_items: users read own"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items: admin read all"
  ON order_items FOR SELECT
  USING (is_admin());

-- ─────────────────────────────────────────
-- LOYALTY ACCOUNTS
-- ─────────────────────────────────────────
CREATE POLICY "loyalty_accounts: users read own"
  ON loyalty_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "loyalty_accounts: admin read all"
  ON loyalty_accounts FOR SELECT
  USING (is_admin());

CREATE POLICY "loyalty_accounts: admin update"
  ON loyalty_accounts FOR UPDATE
  USING (is_admin());

-- ─────────────────────────────────────────
-- LOYALTY TRANSACTIONS
-- ─────────────────────────────────────────
CREATE POLICY "loyalty_tx: users read own"
  ON loyalty_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "loyalty_tx: admin read all"
  ON loyalty_transactions FOR SELECT
  USING (is_admin());

CREATE POLICY "loyalty_tx: admin insert adjustment"
  ON loyalty_transactions FOR INSERT
  WITH CHECK (is_admin());

-- ─────────────────────────────────────────
-- EMAIL LOGS — admin only
-- ─────────────────────────────────────────
CREATE POLICY "email_logs: admin read all"
  ON email_logs FOR SELECT
  USING (is_admin());
