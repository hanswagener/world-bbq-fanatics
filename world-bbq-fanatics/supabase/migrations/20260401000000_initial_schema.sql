-- ============================================================
-- World BBQ Fanatics – Initial Schema
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: public read"
  on public.profiles for select
  using (true);

create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);


-- ── 2. CHANNELS ─────────────────────────────────────────────
create table public.channels (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.channels enable row level security;

create policy "channels: public read"
  on public.channels for select
  using (true);


-- ── 3. RECIPES ──────────────────────────────────────────────
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  description   text,
  ingredients   text,
  instructions  text,
  image_url     text,
  is_public     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "recipes: read public or own"
  on public.recipes for select
  using (is_public = true or auth.uid() = user_id);

create policy "recipes: own insert"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "recipes: own update"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "recipes: own delete"
  on public.recipes for delete
  using (auth.uid() = user_id);


-- ── 4. FLAMES (likes) ───────────────────────────────────────
create table public.flames (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)            -- one flame per user per recipe
);

alter table public.flames enable row level security;

create policy "flames: public read"
  on public.flames for select
  using (true);

create policy "flames: own insert"
  on public.flames for insert
  with check (auth.uid() = user_id);

create policy "flames: own delete"
  on public.flames for delete
  using (auth.uid() = user_id);


-- ── 5. CHANNEL MESSAGES ─────────────────────────────────────
create table public.channel_messages (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.channel_messages enable row level security;

create policy "channel_messages: authenticated read"
  on public.channel_messages for select
  using (auth.role() = 'authenticated');

create policy "channel_messages: own insert"
  on public.channel_messages for insert
  with check (auth.uid() = user_id);

create policy "channel_messages: own delete"
  on public.channel_messages for delete
  using (auth.uid() = user_id);


-- ── 6. PRIVATE ROOMS ────────────────────────────────────────
create table public.private_rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  created_at timestamptz not null default now()
);

alter table public.private_rooms enable row level security;

create policy "private_rooms: member read"
  on public.private_rooms for select
  using (
    exists (
      select 1 from public.private_room_members
      where room_id = private_rooms.id
        and user_id = auth.uid()
    )
  );

create policy "private_rooms: authenticated insert"
  on public.private_rooms for insert
  with check (auth.role() = 'authenticated');


-- ── 7. PRIVATE ROOM MEMBERS ─────────────────────────────────
create table public.private_room_members (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.private_rooms (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

alter table public.private_room_members enable row level security;

create policy "private_room_members: member read"
  on public.private_room_members for select
  using (
    exists (
      select 1 from public.private_room_members as m
      where m.room_id = private_room_members.room_id
        and m.user_id = auth.uid()
    )
  );

create policy "private_room_members: own insert"
  on public.private_room_members for insert
  with check (auth.role() = 'authenticated');

create policy "private_room_members: own delete"
  on public.private_room_members for delete
  using (auth.uid() = user_id);


-- ── 8. PRIVATE MESSAGES ─────────────────────────────────────
create table public.private_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.private_rooms (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.private_messages enable row level security;

create policy "private_messages: member read"
  on public.private_messages for select
  using (
    exists (
      select 1 from public.private_room_members
      where room_id = private_messages.room_id
        and user_id = auth.uid()
    )
  );

create policy "private_messages: member insert"
  on public.private_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.private_room_members
      where room_id = private_messages.room_id
        and user_id = auth.uid()
    )
  );

create policy "private_messages: own delete"
  on public.private_messages for delete
  using (auth.uid() = user_id);


-- ============================================================
-- SEED: Default BBQ community channels
-- ============================================================
insert into public.channels (name, description) values
  ('Smoking & Low and Slow',   'Tips, tricks and talk about low-and-slow smoking techniques.'),
  ('Rubs & Marinades',         'Share your favourite dry rubs, wet marinades and brines.'),
  ('BBQ Equipment',            'Grills, smokers, accessories and gear recommendations.'),
  ('Recipes & Techniques',     'Full recipes, cook-along guides and technique deep-dives.'),
  ('BBQ Events & Meetups',     'Competitions, festivals, local meetups and community events.');
