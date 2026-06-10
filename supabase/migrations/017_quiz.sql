-- Quiz system (Kahoot-like)

create table if not exists public.quizzes (
  id uuid default gen_random_uuid() primary key,
  prof_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  time_limit int not null default 20,
  points int not null default 1000,
  order_index int not null default 0
);

create table if not exists public.quiz_choices (
  id uuid default gen_random_uuid() primary key,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  color text not null check (color in ('red','blue','yellow','green')),
  order_index int not null default 0
);

-- Active game session
create table if not exists public.quiz_sessions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prof_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting','countdown','question','reveal','leaderboard','finished')),
  current_question_index int not null default 0,
  question_started_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists quiz_sessions_join_code_idx on public.quiz_sessions(join_code);
create index if not exists quiz_sessions_status_idx on public.quiz_sessions(status);

-- Players in a session
create table if not exists public.session_players (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null,
  avatar_color text not null default '#7c3aed',
  score int not null default 0,
  streak int not null default 0,
  joined_at timestamptz default now(),
  unique (session_id, user_id)
);

create index if not exists session_players_session_idx on public.session_players(session_id);

-- Player answers per question
create table if not exists public.player_answers (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  player_id uuid not null references public.session_players(id) on delete cascade,
  choice_id uuid references public.quiz_choices(id) on delete set null,
  answered_at timestamptz default now(),
  response_ms int,
  points_earned int not null default 0,
  unique (question_id, player_id)
);

create index if not exists player_answers_session_idx on public.player_answers(session_id, question_id);

-- RLS
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_choices enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.player_answers enable row level security;

-- Quizzes: prof sees own
create policy "Prof sees own quizzes" on public.quizzes
  for select using (auth.uid() = prof_id);
create policy "Prof creates quizzes" on public.quizzes
  for insert with check (auth.uid() = prof_id);
create policy "Prof updates own quizzes" on public.quizzes
  for update using (auth.uid() = prof_id);
create policy "Prof deletes own quizzes" on public.quizzes
  for delete using (auth.uid() = prof_id);

-- Questions/choices: accessible via quiz ownership or active session participant
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

-- Sessions
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

-- Session players
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

-- Player answers
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
