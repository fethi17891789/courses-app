-- Replace 'trimester' with 'weekly' in payment_mode check constraint
alter table public.groups drop constraint if exists groups_payment_mode_check;
alter table public.groups add constraint groups_payment_mode_check
  check (payment_mode in ('monthly', 'per_session', 'weekly'));

-- Convert any existing trimester rows
update public.groups set payment_mode = 'weekly' where payment_mode = 'trimester';
