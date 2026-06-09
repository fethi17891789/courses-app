-- Referral system + in-app feedback (bug reports / feature ideas)

-- One referral code per prof
create table if not exists public.referral_codes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz default now()
);

-- Tracking: who referred who (one row per successful referral)
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

-- Feedback: bug reports and feature suggestions
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

-- All access goes through API routes with the service role key
create policy "Service role only" on public.referral_codes
  for all using (false);
create policy "Service role only" on public.referrals
  for all using (false);
create policy "Service role only" on public.feedback
  for all using (false);
