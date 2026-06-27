-- Performance indexes on frequently filtered columns.
-- Without these, Postgres scans every row to find matches; with thousands of
-- rows per teacher this becomes slow. All indexes are safe to run multiple times.

-- students: listed and counted by teacher
create index if not exists students_teacher_idx on public.students(teacher_id);

-- payments: dashboard revenue (teacher), per-student history, per-group view
create index if not exists payments_teacher_idx on public.payments(teacher_id);
create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payments_group_idx on public.payments(group_id);

-- attendance: dashboard attendance rate (teacher), per-student absences
create index if not exists attendance_teacher_idx on public.attendance(teacher_id);
create index if not exists attendance_student_idx on public.attendance(student_id);

-- group_members: counting/looking up a student's groups
-- (group_id is already covered by the unique(group_id, student_id) index)
create index if not exists group_members_student_idx on public.group_members(student_id);
