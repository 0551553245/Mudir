-- Phase 2: Moyasar billing, payment methods, enforcement

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paid_branch_limit INT NOT NULL DEFAULT 0;

-- Saved payment tokens (Moyasar tokenization)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  moyasar_token TEXT NOT NULL,
  card_company TEXT,
  card_last_four TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_restaurant ON payment_methods(restaurant_id);

-- Payment history
CREATE TABLE billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  moyasar_payment_id TEXT NOT NULL UNIQUE,
  amount_halalas INT NOT NULL,
  branch_count INT NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'subscription',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_payments_restaurant ON billing_payments(restaurant_id);

-- Sync restaurant + subscription status helper
CREATE OR REPLACE FUNCTION sync_subscription_status(p_restaurant_id UUID, p_status subscription_status)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions SET status = p_status, updated_at = now()
  WHERE restaurant_id = p_restaurant_id;
  UPDATE restaurants SET subscription_status = p_status, updated_at = now()
  WHERE id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire trials that have passed end date (call on access or via cron)
CREATE OR REPLACE FUNCTION expire_overdue_trials()
RETURNS VOID AS $$
BEGIN
  UPDATE restaurants r
  SET subscription_status = 'past_due', updated_at = now()
  FROM subscriptions s
  WHERE s.restaurant_id = r.id
    AND r.subscription_status = 'trialing'
    AND r.trial_ends_at < now()
    AND s.status = 'trialing';

  UPDATE subscriptions s
  SET status = 'past_due', updated_at = now()
  FROM restaurants r
  WHERE s.restaurant_id = r.id
    AND r.subscription_status = 'past_due'
    AND s.status = 'trialing'
    AND r.trial_ends_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read payment methods" ON payment_methods FOR SELECT
  USING (restaurant_id = get_owner_restaurant_id());

CREATE POLICY "Owner read billing payments" ON billing_payments FOR SELECT
  USING (restaurant_id = get_owner_restaurant_id());

CREATE POLICY "Super admin all payment methods" ON payment_methods FOR ALL
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Super admin all billing payments" ON billing_payments FOR ALL
  USING (get_user_role() = 'super_admin');
