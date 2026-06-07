-- ============================================================
-- MIGRATION 005: Add refund support
-- ============================================================

-- Add 'refunded' as a valid payment_status
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Store stripe_payment_intent_id so we can look up orders from charge.refunded events
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_orders_payment_intent
  ON orders(stripe_payment_intent_id);
