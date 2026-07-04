-- Admin dashboard: distinguish test keys from real sales, and record the sale
-- price so revenue / MRR can be computed without ever guessing.
--
-- is_test : a key generated for testing. Excluded from ALL business stats so it
--           never inflates sales, MRR or churn.
-- price_da: the sale price in Algerian dinars, recorded at creation time for
--           official keys. NULL / 0 for free keys (referral bonus, test keys).

ALTER TABLE public.activation_keys
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.activation_keys
  ADD COLUMN IF NOT EXISTS price_da integer;

-- Fast lookups for the stats queries (real keys, by activation / expiry dates).
CREATE INDEX IF NOT EXISTS activation_keys_stats_idx
  ON public.activation_keys (is_test, used_at);

CREATE INDEX IF NOT EXISTS activation_keys_expiry_idx
  ON public.activation_keys (is_test, expires_at);
