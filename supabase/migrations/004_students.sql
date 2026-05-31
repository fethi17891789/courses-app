-- Students table (managed by teacher, not tied to auth.users)
create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  parent_phone text,
  level text not null,
  section text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

alter table public.students enable row level security;

create policy "Teachers see own students"
  on public.students for select
  using (auth.uid() = teacher_id);

create policy "Teachers create own students"
  on public.students for insert
  with check (auth.uid() = teacher_id);

create policy "Teachers update own students"
  on public.students for update
  using (auth.uid() = teacher_id);

create policy "Teachers delete own students"
  on public.students for delete
  using (auth.uid() = teacher_id);

-- Update group_members to reference students instead of auth.users
-- Drop old foreign key and add new one
alter table public.group_members drop constraint if exists group_members_student_id_fkey;
alter table public.group_members
  add constraint group_members_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade;
