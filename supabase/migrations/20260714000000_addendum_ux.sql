-- Addendum: category, range types, acknowledgement, notifications, org settings
-- No staff/roster tables

CREATE TYPE task_category AS ENUM (
  'opening',
  'closing',
  'food_safety',
  'cleaning',
  'custom'
);

CREATE TYPE range_type AS ENUM ('min_only', 'max_only', 'min_max');

CREATE TYPE notification_type AS ENUM (
  'failed_reading',
  'missed_checklist',
  'unfilled_shift',
  'billing'
);

-- Tasks: category
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS category task_category NOT NULL DEFAULT 'custom';

-- Food safety standards: range types + check frequency
ALTER TABLE food_safety_standards
  DROP CONSTRAINT IF EXISTS food_safety_standards_check;

ALTER TABLE food_safety_standards
  ALTER COLUMN min_value DROP NOT NULL,
  ALTER COLUMN max_value DROP NOT NULL;

ALTER TABLE food_safety_standards
  ADD COLUMN IF NOT EXISTS range_type range_type NOT NULL DEFAULT 'min_max',
  ADD COLUMN IF NOT EXISTS check_frequency task_frequency NOT NULL DEFAULT 'daily';

-- Backfill existing rows: ensure min/max present for min_max
UPDATE food_safety_standards
SET min_value = COALESCE(min_value, 0),
    max_value = COALESCE(max_value, min_value + 1)
WHERE range_type = 'min_max';

ALTER TABLE food_safety_standards
  ADD CONSTRAINT food_safety_range_valid CHECK (
    (range_type = 'min_only' AND min_value IS NOT NULL AND max_value IS NULL)
    OR (range_type = 'max_only' AND max_value IS NOT NULL AND min_value IS NULL)
    OR (range_type = 'min_max' AND min_value IS NOT NULL AND max_value IS NOT NULL AND min_value < max_value)
  );

-- Recompute pass/fail for range types
CREATE OR REPLACE FUNCTION compute_food_safety_pass()
RETURNS TRIGGER AS $$
DECLARE
  std food_safety_standards%ROWTYPE;
BEGIN
  SELECT * INTO std FROM food_safety_standards WHERE id = NEW.standard_id;
  IF std.range_type = 'min_only' THEN
    NEW.passed := NEW.value >= std.min_value;
  ELSIF std.range_type = 'max_only' THEN
    NEW.passed := NEW.value <= std.max_value;
  ELSE
    NEW.passed := NEW.value >= std.min_value AND NEW.value <= std.max_value;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Readings: failure note + acknowledge
ALTER TABLE food_safety_readings
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES profiles(id);

ALTER TABLE food_safety_readings
  DROP CONSTRAINT IF EXISTS food_safety_fail_note_required;

ALTER TABLE food_safety_readings
  ADD CONSTRAINT food_safety_fail_note_required CHECK (
    passed = true OR (note IS NOT NULL AND length(trim(note)) > 0)
  );

-- Restaurant org settings fields
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS commercial_registration TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  ADD COLUMN IF NOT EXISTS notify_missed_checklist BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_food_safety_failure BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_summary BOOLEAN NOT NULL DEFAULT true;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_restaurant
  ON notifications(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read restaurant notifications" ON notifications FOR SELECT
  USING (
    restaurant_id = get_owner_restaurant_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Owner update own notifications" ON notifications FOR UPDATE
  USING (
    restaurant_id = get_owner_restaurant_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Manager read own notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR restaurant_id = get_manager_restaurant_id());

CREATE POLICY "Super admin all notifications" ON notifications FOR ALL
  USING (get_user_role() = 'super_admin');

-- Service role / authenticated insert for system notifications (via server actions with service client)
CREATE POLICY "Authenticated insert notifications" ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
