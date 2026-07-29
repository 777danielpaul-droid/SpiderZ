-- ============================================================
--  SpiderZ  |  Sammel-System: Booster freigeschaltete Spider
--  Anwenden: Supabase Dashboard → SQL Editor → komplett einfügen → Run.
--  (Ergänzung zu schema.sql + user_saves.sql — nicht ersetzen!)
-- ============================================================

-- 1) Neue Spalten auf nasamon (für Rarität + Verfügbarkeit)
alter table public.nasamon
  add column if not exists rarity    text      not null default 'common',  -- common | rare | legendary
  add column if not exists available boolean   not null default true;       -- false = ausgegraut im Dex

-- 2) Tabelle: user_unlocks (welche Spider hat der User freigeschaltet)
create table if not exists public.user_unlocks (
  user_id      uuid      primary key references auth.users(id) on delete cascade,
  spider_id    integer   not null references nasamon(id) on delete cascade,
  unlocked_at  timestamptz not null default now()
);

-- 3) RLS: User sieht/schreibt NUR seine eigenen Entdeckungen
alter table public.user_unlocks enable row level security;

drop policy if exists "user reads own unlocks" on public.user_unlocks;
create policy "user reads own unlocks"
  on public.user_unlocks for select
  using (auth.uid() = user_id);

drop policy if exists "user writes own unlocks" on public.user_unlocks;
create policy "user writes own unlocks"
  on public.user_unlocks for insert
  with check (auth.uid() = user_id);
