create table if not exists public.activation_keys (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.activation_keys enable row level security;

create policy "Service role only" on public.activation_keys
  for all using (false);
