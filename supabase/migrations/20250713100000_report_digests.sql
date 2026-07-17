-- Email digest preferences for owner reports
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (digest_frequency IN ('weekly', 'off')),
  ADD COLUMN IF NOT EXISTS digest_last_sent_at TIMESTAMPTZ;

UPDATE profiles SET digest_enabled = true WHERE role = 'owner';
