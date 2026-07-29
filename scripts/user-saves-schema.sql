-- ============================================================
-- user_saves Schema für SpiderZ Cloud-Sync
-- Füge fehlende Spalten hinzu (falls noch nicht vorhanden)
-- ============================================================

-- Spalten hinzufügen (IF NOT EXISTS verhindert Fehler bei bereits vorhandenen Spalten)
ALTER TABLE public.user_saves
  ADD COLUMN IF NOT EXISTS steroids    integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collectors  integer   NOT NULL DEFAULT 0;

-- RLS Policies für steroids/collectors (wie die anderen Spalten)
-- SELECT: alle Spalten lesen (Policy gilt für die ganze Tabelle)
-- INSERT/UPDATE: nur eigene Zeile schreiben

-- Falls die Tabelle noch nicht existiert, komplette Erstellung:
-- (Nur ausführen, wenn user_saves noch nicht existiert)
-- CREATE TABLE IF NOT EXISTS public.user_saves (
--   user_id             uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   caught_ids          integer[] DEFAULT '{}',
--   best_team           jsonb     DEFAULT '[]',
--   best_team_strength  integer   DEFAULT 0,
--   steroids            integer   DEFAULT 0,
--   collectors          integer   DEFAULT 0,
--   updated_at          timestamptz DEFAULT now()
-- );
-- ALTER TABLE public.user_saves ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "user reads own save" ON public.user_saves FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "user writes own save" ON public.user_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "user updates own save" ON public.user_saves FOR UPDATE USING (auth.uid() = user_id);

-- updated_at automatisch updaten
-- CREATE OR REPLACE FUNCTION update_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- CREATE TRIGGER user_saves_updated_at
--   BEFORE UPDATE ON public.user_saves
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
