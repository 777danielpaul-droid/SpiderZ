#!/usr/bin/env node
/**
 * seed-experiment-spiders.mjs
 * Fügt die 9 Experiment-Spider zur Datenbank hinzu.
 * Bilder: Experiment001.jpg bis Experiment009.jpg
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

const spiderData = [
  { id: 101, name_de: "Nebel-Spinner", name_en: "Mist Spider", fileName: "Experiment001.jpg", types: ["bug", "poison"], strength: 120, rarity: "common" },
  { id: 102, name_de: "Flammen-Spinner", name_en: "Flame Spider", fileName: "Experiment002.jpg", types: ["fire", "bug"], strength: 150, rarity: "rare" },
  { id: 103, name_de: "Eis-Spinner", name_en: "Ice Spider", fileName: "Experiment003.jpg", types: ["ice", "bug"], strength: 145, rarity: "rare" },
  { id: 104, name_de: "Blitz-Spinner", name_en: "Lightning Spider", fileName: "Experiment004.jpg", types: ["electric", "bug"], strength: 155, rarity: "rare" },
  { id: 105, name_de: "Schatten-Spinner", name_en: "Shadow Spider", fileName: "Experiment005.jpg", types: ["dark", "bug"], strength: 160, rarity: "rare" },
  { id: 106, name_de: "Licht-Spinner", name_en: "Light Spider", fileName: "Experiment006.jpg", types: ["fairy", "bug"], strength: 180, rarity: "legendary" },
  { id: 107, name_de: "Sturmblick", name_en: "Storm Spider", fileName: "Experiment007.jpg", types: ["flying", "bug"], strength: 150, rarity: "rare" },
  { id: 108, name_de: "Gift-Spinner", name_en: "Venom Spider", fileName: "Experiment008.jpg", types: ["poison", "dark"], strength: 155, rarity: "rare" },
  { id: 109, name_de: "Phantom-Spinner", name_en: "Phantom Spider", fileName: "Experiment009.jpg", types: ["ghost", "bug"], strength: 185, rarity: "legendary" },
];

async function seed() {
  console.log("🕷️  Seeding 9 Experiment-Spider...\n");

  for (const spider of spiderData) {
    const artworkUrl = `${SUPABASE_URL}/storage/v1/object/public/nasamon/${spider.fileName}`;

    const { error } = await supabase.from("nasamon").upsert({
      id: spider.id,
      name_de: spider.name_de,
      name_en: spider.name_en,
      artwork: artworkUrl,
      types: spider.types,
      stats: [
        { name: "hp", value: 70 },
        { name: "atk", value: 80 },
        { name: "def", value: 65 },
        { name: "spd", value: 75 },
      ],
      strength: spider.strength,
      height: 1.0,
      weight: 2.0,
      rarity: spider.rarity,
      available: false, // WICHTIG: false = locked im Dex
    });

    if (error) {
      console.error(`❌ Spider #${spider.id} (${spider.name_de}): ${error.message}`);
    } else {
      console.log(`✅ Spider #${spider.id} "${spider.name_de}" (${spider.rarity}) - locked: true`);
    }
  }

  console.log("\n✨ Fertig! 9 neue Spider sind im Dex verfügbar (ausgegraut).");
  console.log("   Sie werden durch Booster freigeschaltet.");
}

seed().catch((err) => {
  console.error("💥 Fehler:", err.message);
  process.exit(1);
});
