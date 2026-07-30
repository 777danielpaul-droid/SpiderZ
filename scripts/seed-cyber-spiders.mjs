#!/usr/bin/env node
/**
 * seed-cyber-spiders.mjs
 * Lädt die 4 Spider-Bilder aus Downloads hoch und erstellt Spider-Einträge.
 *
 * Bilder:
 * 1. rich burgundy and deep blue...cybernetic spiders → "Cyber-Spinner"
 * 2. strong moody style...cybernetic spiders → "Schatten-Spinner"
 * 3. warm golden hour...cybernetic spiders → "Goldene Spinner"
 * 4. wet rainy scene...cybernetic spiders → "Regen-Spinner"
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { extname } from "node:path";

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen in .env");
  process.exit(1);
}

// Service-Role-Client (hat Schreibzugriff auf alle Tabellen)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Spider-Daten mit Bild-Pfaden
const spiderData = [
  {
    name_de: "Cyber-Spinner",
    name_en: "Cyber Spinner",
    localPath: "/Users/danielpaul/Downloads/rich burgundy and deep blue dynamic complex close-up photo composite, three identical cybernetic spiders, primary spider central, two smaller spiders flanking, bright green eyes, metallic damaged bodies, dripping luminescent green slime, ul.jpg",
    types: ["steel", "bug"],
    stats: [
      { name: "hp", value: 75 },
      { name: "atk", value: 90 },
      { name: "def", value: 80 },
      { name: "spd", value: 65 },
    ],
    strength: 160,
    height: 1.2,
    weight: 2.5,
    rarity: "rare",
    nextId: 101,
    fileName: "spider_101.jpg",
  },
  {
    name_de: "Schatten-Spinner",
    name_en: "Shadow Spinner",
    localPath: "/Users/danielpaul/Downloads/strong moody style, high-resolution stock photo, dynamic complex close-up photo composite, three identical cybernetic spiders, primary spider central, two smaller spiders flanking, bright green eyes, metallic damaged bodies, dripping lumine.jpg",
    types: ["dark", "steel"],
    stats: [
      { name: "hp", value: 65 },
      { name: "atk", value: 85 },
      { name: "def", value: 70 },
      { name: "spd", value: 80 },
    ],
    strength: 150,
    height: 1.0,
    weight: 2.0,
    rarity: "rare",
    nextId: 102,
    fileName: "spider_102.jpg",
  },
  {
    name_de: "Goldene Spinner",
    name_en: "Golden Spinner",
    localPath: "/Users/danielpaul/Downloads/warm golden hour light, classic black and white, dynamic complex close-up photo composite, three identical cybernetic spiders, primary spider central, two smaller spiders flanking, bright green eyes, metallic damaged bodies, dripping lumine.jpg",
    types: ["psychic", "steel"],
    stats: [
      { name: "hp", value: 80 },
      { name: "atk", value: 70 },
      { name: "def", value: 75 },
      { name: "spd", value: 90 },
    ],
    strength: 165,
    height: 0.8,
    weight: 1.5,
    rarity: "legendary",
    nextId: 103,
    fileName: "spider_103.jpg",
  },
  {
    name_de: "Regen-Spinner",
    name_en: "Rain Spinner",
    localPath: "/Users/danielpaul/Downloads/wet rainy scene bold acrylic painting of three identical cybernetic spiders, central focus on a larger spider, two smaller ones flanking, bright green metallic eyes, damaged bodies, dripping green slime, ultra-detailed 8k, macro metal and b.jpg",
    types: ["water", "bug"],
    stats: [
      { name: "hp", value: 85 },
      { name: "atk", value: 75 },
      { name: "def", value: 80 },
      { name: "spd", value: 60 },
    ],
    strength: 140,
    height: 1.1,
    weight: 2.2,
    rarity: "common",
    nextId: 104,
    fileName: "spider_104.jpg",
  },
];

async function uploadAndSeed() {
  console.log("🕷️  Starte Cyber-Spinner Seed...\n");

  for (const spider of spiderData) {
    console.log(`📦 Verarbeite: ${spider.name_de}`);

    // 1. Prüfe ob lokale Datei existiert
    let fileBuffer;
    try {
      fileBuffer = readFileSync(spider.localPath);
      console.log(`  ✅ Lokale Datei geladen: ${fileBuffer.length} bytes`);
    } catch (err) {
      console.error(`  ❌ Datei nicht gefunden: ${spider.localPath}`);
      console.error(`     Fehler: ${err.message}`);
      continue;
    }

    // 2. Bestimme Content-Type basierend auf Dateiendung
    const ext = extname(spider.localPath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" :
                        ext === ".webp" ? "image/webp" :
                        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
                        "application/octet-stream";

    // 3. Bild hochladen mit kurzem, sauberem Dateinamen
    const storagePath = `nasamon/${spider.fileName}`;

    console.log(`  📤 Lade hoch: ${storagePath} (${contentType})`);

    const { error: uploadError } = await supabase.storage
      .from("nasamon")
      .upload(storagePath, fileBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ❌ Upload-Fehler: ${uploadError.message}`);
      console.error(`     Status: ${uploadError.status}`);
      continue;
    }

    const artworkUrl = `${SUPABASE_URL}/storage/v1/object/public/nasamon/${spider.fileName}`;
    console.log(`  ✅ Bild hochgeladen: ${artworkUrl}`);

    // 4. Verifiziere Upload
    try {
      const response = await fetch(artworkUrl, { method: "HEAD" });
      if (!response.ok) {
        console.error(`  ❌ Verifizierung fehlgeschlagen: HTTP ${response.status}`);
        continue;
      }
      console.log(`  ✅ Bild ist öffentlich erreichbar`);
    } catch (err) {
      console.error(`  ❌ Verifizierungsfehler: ${err.message}`);
    }

    // 5. Spider in DB eintragen (ohne available/rarity Spalten, falls noch nicht vorhanden)
    const { error: dbError } = await supabase.from("nasamon").upsert({
      id: spider.nextId,
      name_de: spider.name_de,
      name_en: spider.name_en,
      artwork: artworkUrl,
      types: spider.types,
      stats: spider.stats,
      strength: spider.strength,
      height: spider.height,
      weight: spider.weight,
      // rarity und available werden später gesetzt, wenn das Schema angewendet ist
    });

    if (dbError) {
      console.error(`  ❌ DB-Fehler: ${dbError.message}`);
    } else {
      console.log(`  ✅ Spider #${spider.nextId} "${spider.name_de}" erstellt (rarity: ${spider.rarity})\n`);
    }
  }

  console.log("✨ Fertig! 4 neue Cyber-Spinner sind im Dex verfügbar.");
  console.log("   Nach dem Anwenden des SQL-Schemas erscheinen sie ausgegraut.");
  console.log("   Sie werden durch Booster freigeschaltet.");
}

uploadAndSeed().catch((err) => {
  console.error("💥 Fehler:", err.message);
  process.exit(1);
});
