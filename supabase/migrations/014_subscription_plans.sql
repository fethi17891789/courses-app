-- Add subscription plan support (starter / pro)
-- Starter: max 45 students, Pro: unlimited

ALTER TABLE public.activation_keys
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro'));
