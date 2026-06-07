-- Migration 006: Stamp-based loyalty (9 orders → 10th free)

ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS stamp_count integer DEFAULT 0 CHECK (stamp_count >= 0),
  ADD COLUMN IF NOT EXISTS free_orders_available integer DEFAULT 0 CHECK (free_orders_available >= 0);

-- Atomically add a stamp and award a free order every 10 stamps
CREATE OR REPLACE FUNCTION add_loyalty_stamp(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_new_stamps integer;
BEGIN
  INSERT INTO loyalty_accounts (user_id, stamp_count, free_orders_available, total_points)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET stamp_count = loyalty_accounts.stamp_count + 1,
        updated_at  = now();

  SELECT stamp_count INTO v_new_stamps
  FROM loyalty_accounts WHERE user_id = p_user_id;

  -- Award a free order every 10 stamps
  IF v_new_stamps % 10 = 0 THEN
    UPDATE loyalty_accounts
    SET free_orders_available = free_orders_available + 1
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Decrement free orders when redeemed (floors at 0)
CREATE OR REPLACE FUNCTION redeem_free_order(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_available integer;
BEGIN
  SELECT free_orders_available INTO v_available
  FROM loyalty_accounts WHERE user_id = p_user_id;

  IF v_available IS NULL OR v_available <= 0 THEN
    RETURN false;
  END IF;

  UPDATE loyalty_accounts
  SET free_orders_available = free_orders_available - 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
