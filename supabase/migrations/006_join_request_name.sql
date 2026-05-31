-- Store student name in join request so teacher can see who is requesting
alter table public.join_requests
  add column if not exists student_name text,
  add column if not exists student_email text;
