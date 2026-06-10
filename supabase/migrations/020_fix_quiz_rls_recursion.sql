-- Fix: "infinite recursion detected in policy for relation quiz_sessions"
--
-- Cause: les policies RLS se referencaient mutuellement en boucle
--   quiz_sessions -> session_players -> quiz_sessions (+ session_players sur elle-meme).
-- Toute lecture touchant quiz_sessions / session_players / quiz_questions echouait,
-- cassant la liste des quiz ET le lancement/host/join.
--
-- Solution: router toutes les verifications inter-tables par des fonctions
-- SECURITY DEFINER (elles s'executent en tant que proprietaire et ne redeclenchent
-- pas les RLS), donc plus aucune recursion.

-- ── Helper functions ──────────────────────────────────────────────────────────
create or replace function public.is_session_prof(p_session_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.quiz_sessions
    where id = p_session_id and prof_id = auth.uid()
  );
$$;

create or replace function public.is_session_player(p_session_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.session_players
    where session_id = p_session_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_player_see_quiz(p_quiz_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.quiz_sessions qs
    join public.session_players sp on sp.session_id = qs.id
    where qs.quiz_id = p_quiz_id
      and sp.user_id = auth.uid()
      and qs.status <> 'waiting'
  );
$$;

create or replace function public.quiz_id_of_question(p_question_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select quiz_id from public.quiz_questions where id = p_question_id;
$$;

create or replace function public.owns_player(p_player_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.session_players
    where id = p_player_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_session_prof(uuid)    to authenticated, anon;
grant execute on function public.is_session_player(uuid)  to authenticated, anon;
grant execute on function public.can_player_see_quiz(uuid) to authenticated, anon;
grant execute on function public.quiz_id_of_question(uuid) to authenticated, anon;
grant execute on function public.owns_player(uuid)        to authenticated, anon;

-- ── quiz_questions ────────────────────────────────────────────────────────────
drop policy if exists "Quiz owner or player sees questions" on public.quiz_questions;
create policy "Quiz owner or player sees questions" on public.quiz_questions
  for select using (
    exists (select 1 from public.quizzes where id = quiz_id and prof_id = auth.uid())
    or public.can_player_see_quiz(quiz_id)
  );

-- ── quiz_choices ──────────────────────────────────────────────────────────────
drop policy if exists "Quiz owner or player sees choices" on public.quiz_choices;
create policy "Quiz owner or player sees choices" on public.quiz_choices
  for select using (
    exists (
      select 1 from public.quizzes
      where id = public.quiz_id_of_question(question_id) and prof_id = auth.uid()
    )
    or public.can_player_see_quiz(public.quiz_id_of_question(question_id))
  );

-- ── quiz_sessions ─────────────────────────────────────────────────────────────
-- "Player sees joined session" etait recursive (interrogeait session_players).
-- Elle est redondante avec "Anyone authenticated can lookup session by code".
drop policy if exists "Player sees joined session" on public.quiz_sessions;

-- ── session_players ───────────────────────────────────────────────────────────
-- "Players see all players in same session" se referencait elle-meme + quiz_sessions.
drop policy if exists "Players see all players in same session" on public.session_players;
drop policy if exists "Prof sees players" on public.session_players;
drop policy if exists "See players in same session" on public.session_players;
create policy "See players in same session" on public.session_players
  for select using (
    public.is_session_prof(session_id) or public.is_session_player(session_id)
  );

-- ── player_answers ────────────────────────────────────────────────────────────
drop policy if exists "Session participants see answers" on public.player_answers;
create policy "Session participants see answers" on public.player_answers
  for select using (
    public.is_session_prof(session_id) or public.is_session_player(session_id)
  );

drop policy if exists "Player submits own answer" on public.player_answers;
create policy "Player submits own answer" on public.player_answers
  for insert with check (public.owns_player(player_id));
