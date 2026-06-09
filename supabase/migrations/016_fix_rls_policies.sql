-- Fix: drop and recreate RLS policies for tables created in migration 015
-- Run this if 015 failed with "policy already exists"

DROP POLICY IF EXISTS "Service role only" ON public.referral_codes;
DROP POLICY IF EXISTS "Service role only" ON public.referrals;
DROP POLICY IF EXISTS "Service role only" ON public.feedback;

-- Recreate tables that may not have been created yet (safe with IF NOT EXISTS)
create table if not exists public.referral_codes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  referred_name text,
  code text not null,
  created_at timestamptz default now()
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, created_at desc);

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  user_email text,
  type text not null check (type in ('bug', 'idea')),
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'rewarded', 'dismissed')),
  created_at timestamptz default now()
);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.feedback enable row level security;

create policy "Service role only" on public.referral_codes
  for all using (false);
create policy "Service role only" on public.referrals
  for all using (false);
create policy "Service role only" on public.feedback
  for all using (false);
