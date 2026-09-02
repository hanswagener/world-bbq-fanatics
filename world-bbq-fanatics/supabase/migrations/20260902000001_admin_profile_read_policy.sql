create policy "profiles: admin read all"
  on public.profiles for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
