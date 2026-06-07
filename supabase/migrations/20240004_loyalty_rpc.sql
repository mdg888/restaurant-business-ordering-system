-- ============================================================
-- MIGRATION 004: Loyalty RPC helper
-- ============================================================

-- Atomically increment loyalty points (used as upsert fallback)
CREATE OR REPLACE FUNCTION increment_loyalty_points(p_user_id uuid, p_points integer)
RETURNS void AS $$
BEGIN
  INSERT INTO loyalty_accounts (user_id, total_points, updated_at)
  VALUES (p_user_id, GREATEST(0, p_points), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = GREATEST(0, loyalty_accounts.total_points + p_points),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
