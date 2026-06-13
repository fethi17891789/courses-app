-- Add countdown_started_at to quiz_sessions so clients can sync the countdown
-- to server time instead of starting locally from zero.
ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS countdown_started_at TIMESTAMPTZ;
