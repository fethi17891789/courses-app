-- Add unique join code to groups for QR code / link sharing
alter table public.groups
  add column if not exists join_code text unique;

-- Generate codes for existing groups
update public.groups
set join_code = upper(substr(md5(random()::text || id::text), 1, 6))
where join_code is null;

-- Make it not null with a default for new groups
alter table public.groups
  alter column join_code set not null,
  alter column join_code set default upper(substr(md5(random()::text), 1, 6));

-- Allow students (authenticated users) to look up groups by join_code
create policy "Anyone authenticated can lookup group by join_code"
  on public.groups for select
  using (auth.uid() is not null);

-- Allow authenticated students to create join requests
create policy "Students can create join requests"
  on public.join_requests for insert
  with check (auth.uid() = student_id);

-- Allow students to see their own requests
create policy "Students see own requests"
  on public.join_requests for select
  using (auth.uid() = student_id);
