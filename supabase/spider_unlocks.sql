-- ============================================================
--  SpiderZ  |  Sammel-System: Booster freigeschaltete Spider
--  Anwenden: Supabase Dashboard → SQL Editor → komplett einfügen → Run.
--  (Ergänzung zu schema.sql + user_saves.sql — nicht ersetzen!)
-- ============================================================

-- 1) Neue Spalten auf nasamon (für Rarität + Verfügbarkeit)
ALTER TABLE public.nasamon
  ADD COLUMN IF NOT EXISTS rarity    text      NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS available boolean   NOT NULL DEFAULT true;

-- 2) Tabelle: user_unlocks (welche Spider hat der User freigeschaltet)
-- WICHTIG: user_id + spider_id als zusammengesetzter Primary Key
-- (ein User kann mehrere Spider freischalten!)
create table if not exists public.user_unlocks (
  user_id      uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spider_id    integer   NOT NULL REFERENCES nasamon(id) ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spider_id)
);

-- 3) RLS: User sieht/schreibt NUR seine eigenen Entdeckungen
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies (ohne IF NOT EXISTS, da Syntax-Fehler in manchen Versionen)
DROP POLICY IF EXISTS "user reads own unlocks" ON public.user_unlocks;
CREATE POLICY "user reads own unlocks"
  ON public.user_unlocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user writes own unlocks" ON public.user_unlocks;
CREATE POLICY "user writes own unlocks"
  ON public.user_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4) Neue Spider als locked markieren
UPDATE public.nasamon SET available = false WHERE id IN (101, 102, 103, 104);

-- 5) Rarities setzen
UPDATE public.nasamon SET rarity = 'rare' WHERE id = 101;
UPDATE public.nasamon SET rarity = 'rare' WHERE id = 102;
UPDATE public.nasamon SET rarity = 'legendary' WHERE id = 103;
UPDATE public.nasamon SET rarity = 'common' WHERE id = 104;
