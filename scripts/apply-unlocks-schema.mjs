#!/usr/bin/env node
/**
 * apply-unlocks-schema.mjs
 * Versucht das Schema über verschiedene Methoden anzuwenden:
 * 1. Supabase JS Client (für UPDATE)
 * 2. SQL über den PostgREST-Endpoint (für DDL)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen in .env");
  process.exit(1);
}

// Service-Role-Client (hat Admin-Rechte)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "public" },
});

async function applySchema() {
  console.log("🕷️  Wende Schema an...\n");

  // 1. Versuche Spider als locked zu markieren (wenn Spalte existiert)
  console.log("1️⃣  Spider #101-104 als 'locked' markieren...");
  try {
    const { data, error } = await supabase
      .from("nasamon")
      .update({ available: false })
      .in("id", [101, 102, 103, 104]);

    if (error) {
      if (error.message.includes("available")) {
        console.log("   ⚠️  Spalte 'available' existiert noch nicht.");
        console.log("   → Führe zuerst das ALTER TABLE im SQL Editor aus.\n");
      } else {
        console.error("   ❌ Fehler:", error.message);
      }
    } else {
      console.log("   ✅ Spider erfolgreich als 'locked' markiert!\n");
    }
  } catch (err) {
    console.error("   ❌ Verbindungsfehler:", err.message);
  }

  // 2. Versuche user_unlocks Tabelle zu erstellen (über raw SQL)
  console.log("2️⃣  user_unlocks Tabelle erstellen...");
  try {
    // Supabase JS unterstützt kein raw SQL direkt
    // Aber wir können versuchen, eine Tabelle über den Client zu erstellen
    // indem wir versuchen, in eine (noch nicht existierende) Tabelle zu schreiben
    // und die Fehlermeldung zu nutzen

    // Alternative: Nutze die PostgREST-Management-API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        // PostgREST erlaubt kein DDL, aber wir können versuchen
      }),
    });

    // Da das nicht funktioniert, zeigen wir die SQL-Befehle an
    console.log("   ⚠️  DDL kann nicht über API ausgeführt werden.");
    console.log("   → Kopiere diesen SQL-Befehl in den Supabase SQL Editor:\n");

    console.log(`
-- Füge Spalten hinzu (falls nicht vorhanden)
ALTER TABLE public.nasamon
  ADD COLUMN IF NOT EXISTS rarity    text      NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS available boolean   NOT NULL DEFAULT true;

-- Erstelle user_unlocks Tabelle
CREATE TABLE IF NOT EXISTS public.user_unlocks (
  user_id      uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  spider_id    integer   NOT NULL REFERENCES nasamon(id) ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "user reads own unlocks"
  ON public.user_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user writes own unlocks"
  ON public.user_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Markiere neue Spider als locked
UPDATE public.nasamon SET available = false WHERE id IN (101, 102, 103, 104);
    `);

  } catch (err) {
    console.error("   ❌ Fehler:", err.message);
  }

  // 3. Versuche Rarity zu setzen (wenn Spalte existiert)
  console.log("\n3️⃣  Rarity-Werte setzen...");
  try {
    const { error } = await supabase
      .from("nasamon")
      .update({ rarity: "rare" })
      .eq("id", 101);

    if (error && error.message.includes("rarity")) {
      console.log("   ⚠️  Spalte 'rarity' existiert noch nicht. Wird durch ALTER TABLE erstellt.");
    } else if (error) {
      console.error("   ❌ Fehler:", error.message);
    } else {
      // Setze Rarities für alle 4 Spider
      await supabase.from("nasamon").update({ rarity: "rare" }).eq("id", 102);
      await supabase.from("nasamon").update({ rarity: "legendary" }).eq("id", 103);
      await supabase.from("nasamon").update({ rarity: "common" }).eq("id", 104);
      console.log("   ✅ Rarity-Werte gesetzt!");
    }
  } catch (err) {
    console.error("   ❌ Fehler:", err.message);
  }

  console.log("\n✨ Schema-Anwendung abgeschlossen!");
  console.log("   Nach dem Ausführen der SQL-Befehle im Dashboard:");
  console.log("   - 4 Cyber-Spinner erscheinen im Dex ausgegraut");
  console.log("   - Durch Booster freischaltbar");
  console.log("   - user_unlocks Tabelle für Cloud-Sync bereit");
}

applySchema().catch((err) => {
  console.error("💥 Fehler:", err.message);
  process.exit(1);
});
