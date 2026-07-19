-- Per-branch subscription pricing
-- Adapt existing subscriptions (restaurant_id, paid_branch_limit) to explicit price columns.
-- Do not rename restaurant_id → owner_id (this app's schema uses restaurants).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS price_per_branch_sar NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS total_price_sar NUMERIC;

-- Backfill totals from paid slots (or active branch_count when limit is 0)
UPDATE subscriptions
SET
  price_per_branch_sar = COALESCE(price_per_branch_sar, 50),
  total_price_sar = COALESCE(
    total_price_sar,
    GREATEST(COALESCE(paid_branch_limit, 0), COALESCE(branch_count, 0)) * COALESCE(price_per_branch_sar, 50)
  );

ALTER TABLE subscriptions
  ALTER COLUMN total_price_sar SET NOT NULL,
  ALTER COLUMN total_price_sar SET DEFAULT 0;

-- plan tiers no longer apply — drop after backfill
ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan;

-- Enforce branch slots server-side (bypassing UI cannot create past paid limit)
CREATE OR REPLACE FUNCTION enforce_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
  paid_limit INT;
  sub_status subscription_status;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM branches
  WHERE restaurant_id = NEW.restaurant_id
    AND is_active = true;

  -- INSERT counts as +1 against the limit
  IF TG_OP = 'INSERT' THEN
    active_count := active_count + 1;
  END IF;

  SELECT paid_branch_limit, status INTO paid_limit, sub_status
  FROM subscriptions
  WHERE restaurant_id = NEW.restaurant_id;

  IF paid_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Enterprise / unlimited path: paid_branch_limit stays as-is; enterprise uses restaurant status
  IF sub_status = 'enterprise' THEN
    RETURN NEW;
  END IF;

  IF paid_limit <= 0 THEN
    RAISE EXCEPTION 'No paid branch slots — choose a plan or upgrade';
  END IF;

  IF active_count > paid_limit THEN
    RAISE EXCEPTION 'Branch limit reached (%). Upgrade to add more branches.', paid_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON branches;
CREATE TRIGGER trg_enforce_branch_limit
  BEFORE INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION enforce_branch_limit();

-- New owners: start with 1 paid slot priced at 50 SAR (signup can raise this)
CREATE OR REPLACE FUNCTION handle_new_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO restaurants (name, owner_user_id)
    VALUES (COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)), NEW.id);

    INSERT INTO subscriptions (
      restaurant_id,
      branch_count,
      paid_branch_limit,
      price_per_branch_sar,
      total_price_sar,
      status,
      current_period_end
    )
    SELECT
      id,
      0,
      1,
      50,
      50,
      'trialing',
      trial_ends_at
    FROM restaurants
    WHERE owner_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
