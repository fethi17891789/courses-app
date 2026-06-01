-- Replace "for all" policies with explicit per-operation policies.

drop policy if exists "Teachers manage members of own groups" on public.group_members;
drop policy if exists "Teachers insert members of own groups" on public.group_members;
drop policy if exists "Teachers update members of own groups" on public.group_members;
drop policy if exists "Teachers delete members of own groups" on public.group_members;

create policy "Teachers insert members of own groups"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers update members of own groups"
  on public.group_members for update
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers delete members of own groups"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.teacher_id = auth.uid()
    )
  );

-- Add auth_user_id to students so we can link back to join_requests
alter table public.students add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- Same fix for join_requests
drop policy if exists "Teachers manage requests for own groups" on public.join_requests;
drop policy if exists "Teachers insert requests for own groups" on public.join_requests;
drop policy if exists "Teachers update requests for own groups" on public.join_requests;
drop policy if exists "Teachers delete requests for own groups" on public.join_requests;

create policy "Teachers insert requests for own groups"
  on public.join_requests for insert
  with check (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id
      and groups.teacher_id = auth.uid()
    )
    or auth.uid() = student_id
  );

create policy "Teachers update requests for own groups"
  on public.join_requests for update
  using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id
      and groups.teacher_id = auth.uid()
    )
    or auth.uid() = student_id
  );

create policy "Teachers delete requests for own groups"
  on public.join_requests for delete
  using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id
      and groups.teacher_id = auth.uid()
    )
  );
