-- Add the core target temperature for meat recipes.
alter table public.recipes
  add column if not exists core_temp integer;

comment on column public.recipes.core_temp is 'Target internal temperature in Celsius for doneness.';