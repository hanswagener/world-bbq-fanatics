alter table public.recipes
  add column if not exists prep_time integer,
  add column if not exists smoke_time_hours integer,
  add column if not exists smoke_time_minutes integer,
  add column if not exists servings integer,
  add column if not exists difficulty text,
  add column if not exists tips text,
  add column if not exists wood_type text;

comment on column public.recipes.prep_time is 'Preparation time in minutes.';
comment on column public.recipes.smoke_time_hours is 'Smoking or grilling time in hours.';
comment on column public.recipes.smoke_time_minutes is 'Additional smoking or grilling minutes.';