-- Scop: initial schema + RLS
-- Run via Supabase Dashboard SQL Editor or: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'manager');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'enterprise');
CREATE TYPE task_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE schedule_event_type AS ENUM ('training', 'inspection', 'audit', 'other');
CREATE TYPE completion_status AS ENUM ('pending', 'due', 'completed', 'missed');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'owner',
  locale TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id)
);

-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_restaurant ON branches(restaurant_id);

-- Managers (max 2 per branch enforced via trigger)
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (user_id, branch_id)
);

CREATE INDEX idx_managers_branch ON managers(branch_id);
CREATE INDEX idx_managers_restaurant ON managers(restaurant_id);

-- Manager limit trigger
CREATE OR REPLACE FUNCTION check_manager_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM managers WHERE branch_id = NEW.branch_id) >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 managers per branch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_manager_limit
  BEFORE INSERT ON managers
  FOR EACH ROW EXECUTE FUNCTION check_manager_limit();

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  frequency task_frequency NOT NULL DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_restaurant ON tasks(restaurant_id);
CREATE INDEX idx_tasks_branch ON tasks(branch_id);

-- Task items
CREATE TABLE task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  label_ar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_note BOOLEAN NOT NULL DEFAULT false,
  requires_number BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_items_task ON task_items(task_id);

-- Task completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_item_id UUID NOT NULL REFERENCES task_items(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE RESTRICT,
  photo_url TEXT,
  note TEXT,
  number_value NUMERIC,
  status completion_status NOT NULL DEFAULT 'completed',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_completions_item_branch ON task_completions(task_item_id, branch_id);
CREATE INDEX idx_task_completions_submitted ON task_completions(submitted_at DESC);

-- Food safety standards
CREATE TABLE food_safety_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT '°C',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (min_value < max_value)
);

CREATE INDEX idx_food_safety_standards_restaurant ON food_safety_standards(restaurant_id);

-- Food safety readings (passed computed via trigger)
CREATE TABLE food_safety_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES food_safety_standards(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE RESTRICT,
  value NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_safety_readings_standard ON food_safety_readings(standard_id, branch_id);

-- Auto-compute pass/fail on food safety readings
CREATE OR REPLACE FUNCTION compute_food_safety_pass()
RETURNS TRIGGER AS $$
DECLARE
  std food_safety_standards%ROWTYPE;
BEGIN
  SELECT * INTO std FROM food_safety_standards WHERE id = NEW.standard_id;
  NEW.passed := NEW.value >= std.min_value AND NEW.value <= std.max_value;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_safety_pass_trigger
  BEFORE INSERT OR UPDATE OF value ON food_safety_readings
  FOR EACH ROW EXECUTE FUNCTION compute_food_safety_pass();

-- Schedule events
CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  type schedule_event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  event_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_events_restaurant ON schedule_events(restaurant_id);
CREATE INDEX idx_schedule_events_date ON schedule_events(event_date);

-- Subscriptions (Phase 2 billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'standard',
  branch_count INT NOT NULL DEFAULT 0,
  status subscription_status NOT NULL DEFAULT 'trialing',
  moyasar_customer_id TEXT,
  moyasar_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log (super admin)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_owner_restaurant_id()
RETURNS UUID AS $$
  SELECT id FROM restaurants WHERE owner_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_manager_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM managers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_manager_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM managers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER food_safety_standards_updated_at BEFORE UPDATE ON food_safety_standards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create restaurant on owner signup
CREATE OR REPLACE FUNCTION handle_new_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO restaurants (name, owner_user_id)
    VALUES (COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)), NEW.id);
    INSERT INTO subscriptions (restaurant_id, branch_count, status, current_period_end)
    SELECT id, 0, 'trialing', trial_ends_at FROM restaurants WHERE owner_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_owner();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_safety_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_safety_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Super admin read all profiles" ON profiles FOR SELECT USING (get_user_role() = 'super_admin');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Owner read manager profiles in restaurant" ON profiles FOR SELECT
  USING (
    get_user_role() = 'owner' AND id IN (
      SELECT m.user_id FROM managers m WHERE m.restaurant_id = get_owner_restaurant_id()
    )
  );

-- RESTAURANTS policies
CREATE POLICY "Owner read own restaurant" ON restaurants FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Manager read own restaurant" ON restaurants FOR SELECT
  USING (id = get_manager_restaurant_id());
CREATE POLICY "Super admin all restaurants" ON restaurants FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Owner update own restaurant" ON restaurants FOR UPDATE USING (owner_user_id = auth.uid());

-- BRANCHES policies
CREATE POLICY "Owner manage own branches" ON branches FOR ALL
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Manager read own branch" ON branches FOR SELECT
  USING (id = get_manager_branch_id());
CREATE POLICY "Super admin all branches" ON branches FOR ALL USING (get_user_role() = 'super_admin');

-- MANAGERS policies
CREATE POLICY "Owner manage managers" ON managers FOR ALL
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Manager read self" ON managers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin all managers" ON managers FOR ALL USING (get_user_role() = 'super_admin');

-- TASKS policies
CREATE POLICY "Owner manage tasks" ON tasks FOR ALL
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Manager read applicable tasks" ON tasks FOR SELECT
  USING (
    restaurant_id = get_manager_restaurant_id()
    AND (branch_id IS NULL OR branch_id = get_manager_branch_id())
    AND is_active = true
  );
CREATE POLICY "Super admin all tasks" ON tasks FOR ALL USING (get_user_role() = 'super_admin');

-- TASK ITEMS policies
CREATE POLICY "Owner manage task items" ON task_items FOR ALL
  USING (task_id IN (SELECT id FROM tasks WHERE restaurant_id = get_owner_restaurant_id()));
CREATE POLICY "Manager read task items" ON task_items FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = get_manager_restaurant_id()
    AND (branch_id IS NULL OR branch_id = get_manager_branch_id()) AND is_active = true
  ));
CREATE POLICY "Super admin all task items" ON task_items FOR ALL USING (get_user_role() = 'super_admin');

-- TASK COMPLETIONS policies
CREATE POLICY "Owner read completions" ON task_completions FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_owner_restaurant_id()));
CREATE POLICY "Manager manage own branch completions" ON task_completions FOR ALL
  USING (branch_id = get_manager_branch_id());
CREATE POLICY "Super admin all completions" ON task_completions FOR ALL USING (get_user_role() = 'super_admin');

-- FOOD SAFETY STANDARDS policies
CREATE POLICY "Owner manage standards" ON food_safety_standards FOR ALL
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Manager read applicable standards" ON food_safety_standards FOR SELECT
  USING (
    restaurant_id = get_manager_restaurant_id()
    AND (branch_id IS NULL OR branch_id = get_manager_branch_id())
    AND is_active = true
  );
CREATE POLICY "Super admin all standards" ON food_safety_standards FOR ALL USING (get_user_role() = 'super_admin');

-- FOOD SAFETY READINGS policies
CREATE POLICY "Owner read readings" ON food_safety_readings FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_owner_restaurant_id()));
CREATE POLICY "Manager manage own readings" ON food_safety_readings FOR ALL
  USING (branch_id = get_manager_branch_id());
CREATE POLICY "Super admin all readings" ON food_safety_readings FOR ALL USING (get_user_role() = 'super_admin');

-- SCHEDULE EVENTS policies
CREATE POLICY "Owner manage schedule" ON schedule_events FOR ALL
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Manager read applicable schedule" ON schedule_events FOR SELECT
  USING (
    restaurant_id = get_manager_restaurant_id()
    AND (branch_id IS NULL OR branch_id = get_manager_branch_id())
  );
CREATE POLICY "Super admin all schedule" ON schedule_events FOR ALL USING (get_user_role() = 'super_admin');

-- SUBSCRIPTIONS policies
CREATE POLICY "Owner read own subscription" ON subscriptions FOR SELECT
  USING (restaurant_id = get_owner_restaurant_id());
CREATE POLICY "Super admin all subscriptions" ON subscriptions FOR ALL USING (get_user_role() = 'super_admin');

-- ACTIVITY LOG policies
CREATE POLICY "Super admin read activity log" ON activity_log FOR SELECT USING (get_user_role() = 'super_admin');
CREATE POLICY "Authenticated insert activity log" ON activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Storage bucket for photo proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Managers upload proofs" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proofs'
    AND auth.uid() IN (SELECT user_id FROM managers)
  );

CREATE POLICY "Owner read proofs" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proofs'
    AND (
      get_user_role() = 'owner'
      OR auth.uid() IN (SELECT user_id FROM managers)
      OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "Managers read own proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'proofs' AND auth.uid() IN (SELECT user_id FROM managers));

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE food_safety_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE branches;
ALTER PUBLICATION supabase_realtime ADD TABLE managers;
