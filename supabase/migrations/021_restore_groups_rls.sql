-- Fix: "new row violates row-level security policy for table groups" (code 42501)
-- + le prof ne voit plus ses propres groupes (select renvoie 0).
--
-- Cause: les policies RLS de groups / group_members / join_requests ont disparu
-- de la base (RLS active mais aucune policy => tout est refuse). On les restaure
-- a l'identique de la migration 002 (drop if exists pour etre idempotent).

-- ── groups ────────────────────────────────────────────────────────────────────
alter table public.groups enable row level security;

drop policy if exists "Teachers see own groups" on public.groups;
drop policy if exists "Teachers create own groups" on public.groups;
drop policy if exists "Teachers update own groups" on public.groups;
drop policy if exists "Teachers delete own groups" on public.groups;

create policy "Teachers see own groups"
  on public.groups for select using (auth.uid() = teacher_id);
create policy "Teachers create own groups"
  on public.groups for insert with check (auth.uid() = teacher_id);
create policy "Teachers update own groups"
  on public.groups for update using (auth.uid() = teacher_id);
create policy "Teachers delete own groups"
  on public.groups for delete using (auth.uid() = teacher_id);

-- ── group_members ─────────────────────────────────────────────────────────────
alter table public.group_members enable row level security;

drop policy if exists "Teachers see members of own groups" on public.group_members;
drop policy if exists "Teachers manage members of own groups" on public.group_members;

create policy "Teachers see members of own groups"
  on public.group_members for select using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id and groups.teacher_id = auth.uid()
    )
  );
create policy "Teachers manage members of own groups"
  on public.group_members for all using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id and groups.teacher_id = auth.uid()
    )
  );

-- ── join_requests ─────────────────────────────────────────────────────────────
alter table public.join_requests enable row level security;

drop policy if exists "Teachers see requests for own groups" on public.join_requests;
drop policy if exists "Teachers manage requests for own groups" on public.join_requests;

create policy "Teachers see requests for own groups"
  on public.join_requests for select using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id and groups.teacher_id = auth.uid()
    )
  );
create policy "Teachers manage requests for own groups"
  on public.join_requests for all using (
    exists (
      select 1 from public.groups
      where groups.id = join_requests.group_id and groups.teacher_id = auth.uid()
    )
  );
