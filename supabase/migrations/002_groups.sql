-- Groups table
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null,
  section text,
  capacity int not null default 30,
  price int not null default 0,
  payment_mode text not null default 'monthly' check (payment_mode in ('monthly', 'per_session', 'weekly')),
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

create policy "Teachers see own groups"
  on public.groups for select
  using (auth.uid() = teacher_id);

create policy "Teachers create own groups"
  on public.groups for insert
  with check (auth.uid() = teacher_id);

create policy "Teachers update own groups"
  on public.groups for update
  using (auth.uid() = teacher_id);

create policy "Teachers delete own groups"
  on public.groups for delete
  using (auth.uid() = teacher_id);

-- Group members table
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at timestamptz default now(),
  unique (group_id, student_id)
);

alter table public.group_members enable row level security;

create policy "Teachers see members of own groups"
  on public.group_members for select
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers manage members of own groups"
  on public.group_members for all
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.teacher_id = auth.uid()
    )
  );

-- Join requests table
create table if not exists public.join_requests (
  id uuid default gen_random_uuid() primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique (group_id, student_id)
);

alter table public.join_requests enable row level security;

create policy "Teachers see requests for own groups"
  on public.join_requests for select
  using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id
      and groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers manage requests for own groups"
  on public.join_requests for all
  using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id
      and groups.teacher_id = auth.uid()
    )
  );
