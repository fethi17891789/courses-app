-- ============================================================
-- FIX (bug appel) : deux seances le meme jour dans un groupe partageaient la
-- meme cle (group_id + session_day), donc faire l'appel pour l'une marquait
-- l'autre comme faite. On ajoute l'heure de debut (session_time) pour
-- distinguer les seances d'une meme journee.
-- ============================================================

alter table public.attendance add column if not exists session_time text not null default '';
alter table public.payments   add column if not exists session_time text not null default '';

-- Remplace l'ancienne contrainte d'unicite (group_id, student_id, session_date,
-- session_day) par une version incluant session_time.
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.attendance'::regclass and contype = 'u';
  if c is not null then
    execute format('alter table public.attendance drop constraint %I', c);
  end if;
end $$;

create unique index if not exists attendance_session_unique
  on public.attendance (group_id, student_id, session_date, session_day, session_time);
