-- Fix: drop quiz policies before recreating (avoids "already exists" errors)

-- quizzes
drop policy if exists "Prof sees own quizzes" on public.quizzes;
drop policy if exists "Prof creates quizzes" on public.quizzes;
drop policy if exists "Prof updates own quizzes" on public.quizzes;
drop policy if exists "Prof deletes own quizzes" on public.quizzes;

create policy "Prof sees own quizzes" on public.quizzes
  for select using (auth.uid() = prof_id);
create policy "Prof creates quizzes" on public.quizzes
  for insert with check (auth.uid() = prof_id);
create policy "Prof updates own quizzes" on public.quizzes
  for update using (auth.uid() = prof_id);
create policy "Prof deletes own quizzes" on public.quizzes
  for delete using (auth.uid() = prof_id);

-- quiz_questions
drop policy if exists "Quiz owner or player sees questions" on public.quiz_questions;
drop policy if exists "Prof manages questions" on public.quiz_questions;

create policy "Quiz owner or player sees questions" on public.quiz_questions
  for select using (
    exists (select 1 from public.quizzes where id = quiz_id and prof_id = auth.uid())
    or exists (
      select 1 from public.quiz_sessions qs
      join public.session_players sp on sp.session_id = qs.id
      where qs.quiz_id = quiz_id and sp.user_id = auth.uid()
        and qs.status != 'waiting'
    )
  );
create policy "Prof manages questions" on public.quiz_questions
  for all using (
    exists (select 1 from public.quizzes where id = quiz_id and prof_id = auth.uid())
  );

-- quiz_choices
drop policy if exists "Quiz owner or player sees choices" on public.quiz_choices;
drop policy if exists "Prof manages choices" on public.quiz_choices;

create policy "Quiz owner or player sees choices" on public.quiz_choices
  for select using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes qz on qz.id = qq.quiz_id
      where qq.id = question_id and qz.prof_id = auth.uid()
    )
    or exists (
      select 1 from public.quiz_questions qq
      join public.quiz_sessions qs on qs.quiz_id = qq.quiz_id
      join public.session_players sp on sp.session_id = qs.id
      where qq.id = question_id and sp.user_id = auth.uid()
        and qs.status != 'waiting'
    )
  );
create policy "Prof manages choices" on public.quiz_choices
  for all using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes qz on qz.id = qq.quiz_id
      where qq.id = question_id and qz.prof_id = auth.uid()
    )
  );

-- quiz_sessions
drop policy if exists "Prof sees own sessions" on public.quiz_sessions;
drop policy if exists "Player sees joined session" on public.quiz_sessions;
drop policy if exists "Anyone authenticated can lookup session by code" on public.quiz_sessions;
drop policy if exists "Prof creates sessions" on public.quiz_sessions;
drop policy if exists "Prof updates own session" on public.quiz_sessions;

create policy "Prof sees own sessions" on public.quiz_sessions
  for select using (auth.uid() = prof_id);
create policy "Player sees joined session" on public.quiz_sessions
  for select using (
    exists (
      select 1 from public.session_players
      where session_id = id and user_id = auth.uid()
    )
  );
create policy "Anyone authenticated can lookup session by code" on public.quiz_sessions
  for select using (auth.uid() is not null);
create policy "Prof creates sessions" on public.quiz_sessions
  for insert with check (auth.uid() = prof_id);
create policy "Prof updates own session" on public.quiz_sessions
  for update using (auth.uid() = prof_id);

-- session_players
drop policy if exists "Players see all players in same session" on public.session_players;
drop policy if exists "Player joins session" on public.session_players;
drop policy if exists "Prof sees players" on public.session_players;

create policy "Players see all players in same session" on public.session_players
  for select using (
    exists (
      select 1 from public.quiz_sessions
      where id = session_id
        and (prof_id = auth.uid() or exists (
          select 1 from public.session_players sp2
          where sp2.session_id = session_id and sp2.user_id = auth.uid()
        ))
    )
  );
create policy "Player joins session" on public.session_players
  for insert with check (auth.uid() = user_id);
create policy "Prof sees players" on public.session_players
  for select using (
    exists (select 1 from public.quiz_sessions where id = session_id and prof_id = auth.uid())
  );

-- player_answers
drop policy if exists "Player submits own answer" on public.player_answers;
drop policy if exists "Session participants see answers" on public.player_answers;

create policy "Player submits own answer" on public.player_answers
  for insert with check (
    exists (
      select 1 from public.session_players
      where id = player_id and user_id = auth.uid()
    )
  );
create policy "Session participants see answers" on public.player_answers
  for select using (
    exists (
      select 1 from public.quiz_sessions qs
      where qs.id = session_id
        and (qs.prof_id = auth.uid() or exists (
          select 1 from public.session_players sp
          where sp.session_id = session_id and sp.user_id = auth.uid()
        ))
    )
  );
