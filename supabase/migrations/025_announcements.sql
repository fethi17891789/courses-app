-- Announcements: a teacher posts a title + body targeting one or more of their groups.
-- Students see announcements for the groups they belong to (with teacher name + group name).
-- Push notifications are planned for V2 (OneSignal) and are NOT wired here.

create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalized teacher name so students can display "who" without reading auth.users.
  teacher_name text not null default '',
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Which groups an announcement targets.
create table if not exists public.announcement_groups (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (announcement_id, group_id)
);

-- Per-user read tracking (for the unread badge).
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (announcement_id, user_id)
);

create index if not exists announcements_teacher_idx on public.announcements(teacher_id, created_at desc);
create index if not exists announcement_groups_group_idx on public.announcement_groups(group_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.announcements enable row level security;
alter table public.announcements force row level security;
alter table public.announcement_groups enable row level security;
alter table public.announcement_groups force row level security;
alter table public.announcement_reads enable row level security;
alter table public.announcement_reads force row level security;

-- announcements: teacher fully manages own. Students read via security-definer function below.
create policy "Teachers see own announcements" on public.announcements
  for select using (auth.uid() = teacher_id);
create policy "Teachers create own announcements" on public.announcements
  for insert with check (auth.uid() = teacher_id);
create policy "Teachers update own announcements" on public.announcements
  for update using (auth.uid() = teacher_id);
create policy "Teachers delete own announcements" on public.announcements
  for delete using (auth.uid() = teacher_id);

-- announcement_groups: teacher manages rows for own announcements, targeting own groups.
create policy "Teachers see own announcement groups" on public.announcement_groups
  for select using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_id and a.teacher_id = auth.uid()
    )
  );
create policy "Teachers manage own announcement groups" on public.announcement_groups
  for all using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_id and a.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_id and a.teacher_id = auth.uid()
    )
    and exists (
      select 1 from public.groups g
      where g.id = group_id and g.teacher_id = auth.uid()
    )
  );

-- announcement_reads: a user can only mark/read their own read state.
create policy "Users mark own reads" on public.announcement_reads
  for insert with check (auth.uid() = user_id);
create policy "Users see own reads" on public.announcement_reads
  for select using (auth.uid() = user_id);
create policy "Users update own reads" on public.announcement_reads
  for update using (auth.uid() = user_id);

-- ── Student feed (security definer to bypass RLS on students/group_members cleanly) ──
create or replace function public.student_announcements(uid uuid)
returns table (
  id uuid,
  title text,
  body text,
  teacher_name text,
  pinned boolean,
  created_at timestamptz,
  group_names text,
  read_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.body,
    a.teacher_name,
    a.pinned,
    a.created_at,
    string_agg(distinct g.name, ', ') as group_names,
    max(ar.read_at) as read_at
  from announcements a
  join announcement_groups ag on ag.announcement_id = a.id
  join groups g on g.id = ag.group_id
  join group_members gm on gm.group_id = ag.group_id
  join students s on s.id = gm.student_id
  left join announcement_reads ar
    on ar.announcement_id = a.id and ar.user_id = uid
  where s.auth_user_id = uid
  group by a.id, a.title, a.body, a.teacher_name, a.pinned, a.created_at
  order by a.pinned desc, a.created_at desc;
$$;

revoke all on function public.student_announcements(uuid) from public;
grant execute on function public.student_announcements(uuid) to authenticated;
