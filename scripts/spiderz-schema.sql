-- ============================================================
-- SpiderZ Cloud-Sync Schema
-- Komplettes Setup für Supabase SQL Editor
-- ============================================================

-- 1) Neue Spalten auf nasamon
ALTER TABLE public.nasamon
  ADD COLUMN IF NOT EXISTS rarity    text      NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS available boolean   NOT NULL DEFAULT true;

-- 2) Tabelle: user_unlocks (korrekt mit zusammengesetztem Primary Key)
DROP TABLE IF EXISTS public.user_unlocks CASCADE;

CREATE TABLE public.user_unlocks (
  user_id      uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spider_id    integer   NOT NULL REFERENCES nasamon(id) ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spider_id)
);

-- RLS aktivieren
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "user reads own unlocks"
  ON public.user_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user writes own unlocks"
  ON public.user_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own unlocks"
  ON public.user_unlocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user deletes own unlocks"
  ON public.user_unlocks FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Neue Spider als locked markieren
UPDATE public.nasamon SET available = false WHERE id IN (101, 102, 103, 104);

-- 4) Rarities setzen
UPDATE public.nasamon SET rarity = 'rare' WHERE id = 101;
UPDATE public.nasamon SET rarity = 'rare' WHERE id = 102;
UPDATE public.nasamon SET rarity = 'legendary' WHERE id = 103;
UPDATE public.nasamon SET rarity = 'common' WHERE id = 104;

-- 5) Storage-Policy für öffentlichen Zugriff auf nasamon Bucket
DROP POLICY IF EXISTS "public read nasamon objects" ON storage.objects;
CREATE POLICY "public read nasamon objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nasamon');

-- Bucket auf public setzen
UPDATE storage.buckets SET public = true WHERE id = 'nasamon';

-- 6) user_saves Tabelle erstellen (falls noch nicht vorhanden)
--    mit allen Spalten inkl. steroids + collectors
CREATE TABLE IF NOT EXISTS public.user_saves (
  user_id             uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  caught_ids          integer[] DEFAULT '{}',
  best_team           jsonb     DEFAULT '[]',
  best_team_strength  integer   DEFAULT 0,
  steroids            integer   DEFAULT 0,
  collectors          integer   DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

-- RLS für user_saves aktivieren
ALTER TABLE public.user_saves ENABLE ROW LEVEL SECURITY;

-- Policies für user_saves (DROP IF EXISTS vor CREATE, da PostgreSQL kein IF NOT EXISTS für Policies unterstützt)
DROP POLICY IF EXISTS "user reads own save" ON public.user_saves;
CREATE POLICY "user reads own save"
  ON public.user_saves FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user writes own save" ON public.user_saves;
CREATE POLICY "user writes own save"
  ON public.user_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user updates own save" ON public.user_saves;
CREATE POLICY "user updates own save"
  ON public.user_saves FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user deletes own save" ON public.user_saves;
CREATE POLICY "user deletes own save"
  ON public.user_saves FOR DELETE
  USING (auth.uid() = user_id);

-- 7) Spalten hinzufügen (falls Tabelle existiert, aber Spalten fehlen)
ALTER TABLE public.user_saves
  ADD COLUMN IF NOT EXISTS steroids    integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collectors  integer   NOT NULL DEFAULT 0;

-- Kommentare für die Dokumentation
COMMENT ON COLUMN public.user_saves.steroids IS 'Gesammelte Steroide (je 1 = +100 Stärke im Kampf)';
COMMENT ON COLUMN public.user_saves.collectors IS 'Gesammelte Collector-Items (Sammel-Fortschritt)';

-- 8) updated_at automatisch updaten
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_saves_updated_at ON public.user_saves;
CREATE TRIGGER user_saves_updated_at
  BEFORE UPDATE ON public.user_saves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
