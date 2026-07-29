-- ============================================================
--  SpiderZ  |  Cloud-Sync der Spielstände
--  Tabelle: user_saves  (pro angemeldetem User genau eine Zeile)
--  Anwenden: Supabase Dashboard → SQL Editor → komplett einfügen → Run.
--  (Ergänzung zu schema.sql — nicht ersetzen!)
-- ============================================================

-- 1) Tabelle: user_saves
create table if not exists public.user_saves (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  caught_ids         integer[]   not null default '{}',         -- alle je gefangenen Spider-IDs
  best_team          jsonb       not null default '[]',          -- [{id,name_de,types,artwork,strength}]
  best_team_strength integer     not null default 0,            -- hoechste Team-Staerke einer Runde
  steroids           integer     not null default 0,            -- gesammelte Steroide (je 1 = +100 Stärke im Kampf)
  collectors         integer     not null default 0,            -- gesammelte Collector-Items (Sammler-Fortschritt)
  updated_at         timestamptz not null default now()
);

-- 2) Automatischer updated_at-Stempel bei jedem Write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_saves_touch on public.user_saves;
create trigger trg_user_saves_touch
  before update on public.user_saves
  for each row execute function public.touch_updated_at();

-- 3) RLS: User sieht/schreibt NUR seine eigene Zeile (kein service_role im Frontend nötig)
alter table public.user_saves enable row level security;

drop policy if exists "user reads own save" on public.user_saves;
create policy "user reads own save"
  on public.user_saves for select
  using (auth.uid() = user_id);

drop policy if exists "user writes own save" on public.user_saves;
create policy "user writes own save"
  on public.user_saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "user updates own save" on public.user_saves;
create policy "user updates own save"
  on public.user_saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user deletes own save" on public.user_saves;
create policy "user deletes own save"
  on public.user_saves for delete
  using (auth.uid() = user_id);
