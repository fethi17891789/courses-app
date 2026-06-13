-- Fix: session_players INSERT policy "Player joins session" missing from database
-- (was defined in migration 018 but disappeared -- likely a partial migration failure)
--
-- Also: session_players UPDATE policy missing (needed for score updates in answer route).
-- Score updates are done server-side via service role, so we intentionally do NOT add
-- a permissive UPDATE policy for students (they could otherwise patch their own score).
-- The answer route will use the service role client for score updates.

-- Restore INSERT policy: student can join a session as themselves
drop policy if exists "Player joins session" on public.session_players;
create policy "Player joins session" on public.session_players
  for insert with check (auth.uid() = user_id);
