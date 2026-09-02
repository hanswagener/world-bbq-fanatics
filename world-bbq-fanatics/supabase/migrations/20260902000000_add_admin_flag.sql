alter table public.profiles
  add column if not exists is_admin boolean default false;
