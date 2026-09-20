alter table public.recipes
  add column if not exists cook_time_minutes integer;

alter table public.recipes
  drop column if exists smoke_time_hours,
  drop column if exists smoke_time_minutes;

comment on column public.recipes.cook_time_minutes is 'Smoking or grilling time in total minutes.';