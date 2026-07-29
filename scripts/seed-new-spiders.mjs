#!/usr/bin/env node
/**
 * seed-new-spiders.mjs
 * Fügt neue Spider zur Supabase-DB hinzu (mit available=false → locked im Dex).
 *
 * Usage:
 *   node scripts/seed-new-spiders.mjs
 *
 * Die Spider-Daten (name, types, stats, artwork-URL) werden hier definiert.
 * Das Skript nutzt den Service-Role-Key (aus .env) für Schreibzugriff.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config(); // lädt .env

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

// ===== NEUE SPIDER HIER DEFINIEREN =====
// Jede Spinne braucht: id, name_de, name_en, artwork (Storage-URL), types, stats, strength, height, weight, rarity
const newSpiders = [
  {
    id: 101,
    name_de: "Nacht-Spinne",
    name_en: "Night Spider",
    artwork: `${SUPABASE_URL}/storage/v1/object/public/nasamon/spider_night.png`,
    types: ["dark", "bug"],
    stats: [
      { name: "hp", value: 60 },
      { name: "atk", value: 80 },
      { name: "def", value: 50 },
      { name: "spd", value: 70 },
    ],
    strength: 140,
    height: 0.8,
    weight: 1.2,
    rarity: "rare",
  },
  {
    id: 102,
    name_de: "Licht-Spinne",
    name_en: "Light Spider",
    artwork: `${SUPABASE_URL}/storage/v1/object/public/nasamon/spider_light.png`,
    types: ["fairy", "psychic"],
    stats: [
      { name: "hp", value: 70 },
      { name: "atk", value: 60 },
      { name: "def", value: 65 },
      { name: "spd", value: 90 },
    ],
    strength: 155,
    height: 0.5,
    weight: 0.8,
    rarity: "legendary",
  },
  {
    id: 103,
    name_de: "Berg-Spinne",
    name_en: "Mountain Spider",
    artwork: `${SUPABASE_URL}/storage/v1/object/public/nasamon/spider_mountain.png`,
    types: ["rock", "ground"],
    stats: [
      { name: "hp", value: 90 },
      { name: "atk", value: 85 },
      { name: "def", value: 95 },
      { name: "spd", value: 40 },
    ],
    strength: 170,
    height: 1.5,
    weight: 3.0,
    rarity: "common",
  },
  // Füge hier weitere Spider hinzu...
];

async function seed() {
  console.log(`🕷️  Seeding ${newSpiders.length} neue Spider...`);

  for (const spider of newSpiders) {
    const { error } = await supabase.from("nasamon").upsert({
      id: spider.id,
      name_de: spider.name_de,
      name_en: spider.name_en,
      artwork: spider.artwork,
      types: spider.types,
      stats: spider.stats,
      strength: spider.strength,
      height: spider.height,
      weight: spider.weight,
      rarity: spider.rarity,
      available: false, // WICHTIG: false = locked im Dex
    });

    if (error) {
      console.error(`❌ Fehler bei Spider #${spider.id} (${spider.name_de}):`, error.message);
    } else {
      console.log(`✅ Spider #${spider.id} "${spider.name_de}" hinzugefügt (rarity: ${spider.rarity}, locked: true)`);
    }
  }

  console.log("\n✨ Fertig! Neue Spider erscheinen automatisch ausgegraut im Dex.");
  console.log("   Sie werden durch Booster freigeschaltet.");
}

seed().catch((err) => {
  console.error("💥 Seed-Fehler:", err.message);
  process.exit(1);
});
