-- Active Supabase Realtime sur les tables du quiz (flux Kahoot temps reel).
-- Sans ca : la salle d'attente reste vide et les joueurs sont bloques.
-- Bloc idempotent : n'ajoute la table que si elle n'est pas deja publiee.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quiz_sessions'
  ) then
    alter publication supabase_realtime add table public.quiz_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_players'
  ) then
    alter publication supabase_realtime add table public.session_players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'player_answers'
  ) then
    alter publication supabase_realtime add table public.player_answers;
  end if;
end $$;
