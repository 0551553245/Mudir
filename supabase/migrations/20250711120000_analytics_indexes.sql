-- Phase 3: analytics query performance
CREATE INDEX IF NOT EXISTS idx_food_safety_readings_submitted
  ON food_safety_readings(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_completions_branch_submitted
  ON task_completions(branch_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurants_created
  ON restaurants(created_at DESC);
