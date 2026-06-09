-- ============================================================
-- FIX: Tables accessibles avec la cle anon sans authentification
-- Detecte par pentest le 2026-06-04
--
-- FORCE ROW LEVEL SECURITY force le RLS meme pour le owner
-- des tables, ce qui bloque tout acces non autorise.
-- ============================================================

-- 1. ACTIVATION_KEYS : bloquer tout acces (sauf service_role)
alter table public.activation_keys enable row level security;
alter table public.activation_keys force row level security;

drop policy if exists "Service role only" on public.activation_keys;
create policy "Block all direct access"
  on public.activation_keys for all
  using (false)
  with check (false);


-- 2. GROUPS : forcer le RLS
alter table public.groups force row level security;


-- 3. STUDENTS : forcer le RLS
alter table public.students force row level security;


-- 4. PAYMENTS : forcer le RLS
alter table public.payments force row level security;


-- 5. ATTENDANCE : forcer le RLS
alter table public.attendance force row level security;


-- 6. GROUP_MEMBERS : forcer le RLS
alter table public.group_members force row level security;


-- 7. JOIN_REQUESTS : forcer le RLS
alter table public.join_requests force row level security;
