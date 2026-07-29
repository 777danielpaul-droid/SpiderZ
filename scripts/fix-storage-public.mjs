#!/usr/bin/env node
/**
 * fix-storage-public.mjs
 * Macht den nasamon Storage-Bucket öffentlich zugänglich.
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixStorage() {
  console.log("🔧 Mache nasamon Bucket öffentlich...\n");

  // 1. Bucket auf public setzen
  const { error: bucketError } = await supabase.storage.updateBucket("nasamon", {
    public: true,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    fileSizeLimit: 10485760, // 10MB
  });

  if (bucketError) {
    console.error("❌ Bucket-Update-Fehler:", bucketError.message);
  } else {
    console.log("✅ Bucket 'nasamon' ist jetzt public");
  }

  // 2. Storage-Policy für öffentiges Lesen erstellen
  // Da wir kein raw SQL ausführen können, nutzen wir die Management API
  // oder zeigen die SQL-Befehle an

  console.log("\n📝 SQL-Befehle für Storage-Policy (falls noch nicht gesetzt):");
  console.log(`
-- Bucket öffentlich machen
INSERT INTO storage.buckets (id, name, public)
VALUES ('nasamon', 'nasamon', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Öffentliche Les-Policy
DROP POLICY IF EXISTS "public read nasamon objects" ON storage.objects;
CREATE POLICY "public read nasamon objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nasamon');

-- Schreibrecht nur für Service-Role
DROP POLICY IF EXISTS "service write nasamon objects" ON storage.objects;
CREATE POLICY "service write nasamon objects"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'nasamon');
  `);

  // 3. Teste ob die Bilder jetzt erreichbar sind
  console.log("\n🧪 Teste Bild-Zugriff...");
  const testUrl = `${SUPABASE_URL}/storage/v1/object/public/nasamon/spider_101.jpg`;

  try {
    const response = await fetch(testUrl);
    if (response.ok) {
      console.log(`✅ Bild ist jetzt öffentlich erreichbar! (${response.status})`);
    } else {
      console.log(`⚠️  Bild noch nicht erreichbar: HTTP ${response.status}`);
      console.log("   → Führe die SQL-Befehle oben im Dashboard aus");
    }
  } catch (err) {
    console.error("❌ Verbindungsfehler:", err.message);
  }
}

fixStorage().catch((err) => {
  console.error("💥 Fehler:", err.message);
  process.exit(1);
});
