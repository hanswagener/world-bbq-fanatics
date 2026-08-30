-- Store each user's preferred interface language for chat flags.
alter table public.profiles
  add column if not exists language text default 'nl';
