-- Add student profile fields to join_requests so the teacher gets complete info
alter table public.join_requests
  add column if not exists phone text,
  add column if not exists parent_phone text,
  add column if not exists level text,
  add column if not exists section text,
  add column if not exists notes text;
