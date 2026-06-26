-- Subjects: a teacher uploads a PDF (exam subject / revision sheet) targeting one or
-- more of their groups. Students who belong to a targeted group can VIEW it in-app.
-- Files live in a private Storage bucket; access is granted through short-lived signed
-- URLs minted server-side (service role) only after the group-membership check passes.
--
-- Egress note: files are capped at 5 MB (bucket level) and served with a long
-- Cache-Control so the browser / service worker cache repeat views for free.

-- ── Storage bucket (private, PDF only, 5 MB max) ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('subjects', 'subjects', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- A prof may only read/write objects inside their own folder: subjects/{auth.uid}/...
-- Students never touch Storage directly; they go through the signed-URL endpoint.
create policy "Profs manage own subject files" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'subjects'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'subjects'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalized teacher name so students can display "who" without reading auth.users.
  teacher_name text not null default '',
  title text not null,
  file_path text not null,
  file_size bigint not null default 0,
  created_at timestamptz default now()
);

-- Which groups a subject targets.
create table if not exists public.subject_groups (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (subject_id, group_id)
);

create index if not exists subjects_teacher_idx on public.subjects(teacher_id, created_at desc);
create index if not exists subject_groups_group_idx on public.subject_groups(group_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.subjects enable row level security;
alter table public.subjects force row level security;
alter table public.subject_groups enable row level security;
alter table public.subject_groups force row level security;

create policy "Teachers see own subjects" on public.subjects
  for select using (auth.uid() = teacher_id);
create policy "Teachers create own subjects" on public.subjects
  for insert with check (auth.uid() = teacher_id);
create policy "Teachers update own subjects" on public.subjects
  for update using (auth.uid() = teacher_id);
create policy "Teachers delete own subjects" on public.subjects
  for delete using (auth.uid() = teacher_id);

create policy "Teachers see own subject groups" on public.subject_groups
  for select using (
    exists (
      select 1 from public.subjects s
      where s.id = subject_id and s.teacher_id = auth.uid()
    )
  );
create policy "Teachers manage own subject groups" on public.subject_groups
  for all using (
    exists (
      select 1 from public.subjects s
      where s.id = subject_id and s.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.subjects s
      where s.id = subject_id and s.teacher_id = auth.uid()
    )
    and exists (
      select 1 from public.groups g
      where g.id = group_id and g.teacher_id = auth.uid()
    )
  );

-- ── Student feed (security definer, same pattern as student_announcements) ────
create or replace function public.student_subjects(uid uuid)
returns table (
  id uuid,
  title text,
  teacher_name text,
  file_size bigint,
  created_at timestamptz,
  group_names text
)
language sql
security definer
set search_path = public
as $$
  select
    sub.id,
    sub.title,
    sub.teacher_name,
    sub.file_size,
    sub.created_at,
    string_agg(distinct g.name, ', ') as group_names
  from subjects sub
  join subject_groups sg on sg.subject_id = sub.id
  join groups g on g.id = sg.group_id
  join group_members gm on gm.group_id = sg.group_id
  join students s on s.id = gm.student_id
  where s.auth_user_id = uid
  group by sub.id, sub.title, sub.teacher_name, sub.file_size, sub.created_at
  order by sub.created_at desc;
$$;

revoke all on function public.student_subjects(uuid) from public;
grant execute on function public.student_subjects(uuid) to authenticated;

-- ── Access check used by the signed-URL endpoint ─────────────────────────────
-- True when the user is a student enrolled in at least one group the subject targets.
create or replace function public.can_access_subject(uid uuid, sid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from subject_groups sg
    join group_members gm on gm.group_id = sg.group_id
    join students s on s.id = gm.student_id
    where sg.subject_id = sid and s.auth_user_id = uid
  );
$$;

revoke all on function public.can_access_subject(uuid, uuid) from public;
grant execute on function public.can_access_subject(uuid, uuid) to authenticated;
