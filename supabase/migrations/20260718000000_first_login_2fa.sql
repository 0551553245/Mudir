-- First-login 2FA: mark when a user has completed email OTP once.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_login_verified_at TIMESTAMPTZ;

-- Existing accounts skip the one-time gate.
UPDATE profiles
SET first_login_verified_at = COALESCE(created_at, now())
WHERE first_login_verified_at IS NULL;

-- Short-lived OTP codes for first-login verification (service role only).
CREATE TABLE IF NOT EXISTS login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_otps_user_id_idx ON login_otps(user_id);
CREATE INDEX IF NOT EXISTS login_otps_expires_at_idx ON login_otps(expires_at);

ALTER TABLE login_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role can read/write OTP rows.
