// ============================================================
//  NasaMon Seed  (läuft NUR lokal mit Service-Role-Key)
//  - lädt die 18 Bilder aus ~/Desktop/NasaMon nach Supabase Storage
//  - legt 18 nasamon-Datensätze an (eigene Namen + Stats)
//  Voraussetzungen:
//    1) .env mit VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
//       SUPABASE_SERVICE_ROLE_KEY (NICHT committen!)
//    2) schema.sql im Dashboard ausgeführt (Tabelle + Bucket)
//  Start:  node scripts/seed.mjs
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config(); // liest .env

const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("FEHLER: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env fehlen.");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } });

// 18 NasaMon (Reihenfolge = Reihenfolge der Bilddateien im Ordner)
// stats: hp, attack, defense, special-attack, special-defense, speed (wie PokeAPI)
const CARDS = [
  { name_de: "Arachnex",   name_en: "arachnex",   types: ["bug", "dark"],
    stats: { hp: 70, attack: 110, defense: 80, "special-attack": 60, "special-defense": 70, speed: 95 } },
  { name_de: "Noxfang",    name_en: "noxfang",    types: ["dark", "poison"],
    stats: { hp: 65, attack: 95, defense: 75, "special-attack": 85, "special-defense": 72, speed: 88 } },
  { name_de: "Cybrolith",  name_en: "cybrolith",  types: ["steel", "bug"],
    stats: { hp: 80, attack: 100, defense: 120, "special-attack": 55, "special-defense": 90, speed: 60 } },
  { name_de: "Venomaw",    name_en: "venomaw",    types: ["poison", "bug"],
    stats: { hp: 72, attack: 105, defense: 78, "special-attack": 78, "special-defense": 74, speed: 92 } },
  { name_de: "Toxipede",   name_en: "toxipede",   types: ["poison", "water"],
    stats: { hp: 68, attack: 88, defense: 82, "special-attack": 70, "special-defense": 80, speed: 84 } },
  { name_de: "Glimmern",   name_en: "glimmern",   types: ["fairy", "bug"],
    stats: { hp: 60, attack: 70, defense: 65, "special-attack": 110, "special-defense": 95, speed: 102 } },
  { name_de: "Schattnetz", name_en: "schattnetz", types: ["ghost", "bug"],
    stats: { hp: 66, attack: 92, defense: 70, "special-attack": 100, "special-defense": 88, speed: 96 } },
  { name_de: "Korrtex",    name_en: "korrtex",    types: ["steel", "dark"],
    stats: { hp: 75, attack: 108, defense: 110, "special-attack": 62, "special-defense": 85, speed: 66 } },
  { name_de: "Skizzara",   name_en: "skizzara",   types: ["psychic", "bug"],
    stats: { hp: 64, attack: 76, defense: 68, "special-attack": 115, "special-defense": 92, speed: 98 } },
  { name_de: "Sturmklaue", name_en: "sturmklaue", types: ["flying", "bug"],
    stats: { hp: 70, attack: 102, defense: 74, "special-attack": 72, "special-defense": 76, speed: 116 } },
  { name_de: "Regenmaul",  name_en: "regenmaul",  types: ["water", "dark"],
    stats: { hp: 78, attack: 98, defense: 86, "special-attack": 82, "special-defense": 84, speed: 80 } },
  { name_de: "Pastellia",  name_en: "pastellia",  types: ["fairy", "psychic"],
    stats: { hp: 62, attack: 68, defense: 66, "special-attack": 108, "special-defense": 98, speed: 100 } },
  { name_de: "Terracotta", name_en: "terracotta", types: ["ground", "fire"],
    stats: { hp: 82, attack: 112, defense: 95, "special-attack": 66, "special-defense": 72, speed: 70 } },
  { name_de: "Hochsicht",  name_en: "hochsicht",  types: ["flying", "fighting"],
    stats: { hp: 74, attack: 106, defense: 80, "special-attack": 64, "special-defense": 78, speed: 110 } },
  { name_de: "Bioleucht",  name_en: "bioleucht",  types: ["electric", "bug"],
    stats: { hp: 66, attack: 90, defense: 72, "special-attack": 105, "special-defense": 86, speed: 108 } },
  { name_de: "Pulsarion",  name_en: "pulsarion",  types: ["electric", "dark"],
    stats: { hp: 68, attack: 96, defense: 74, "special-attack": 112, "special-defense": 88, speed: 104 } },
  { name_de: "Neonarach",  name_en: "neonarach",  types: ["bug", "electric"],
    stats: { hp: 64, attack: 100, defense: 76, "special-attack": 98, "special-defense": 82, speed: 112 } },
  { name_de: "Synthetica", name_en: "synthetica", types: ["steel", "fairy"],
    stats: { hp: 80, attack: 94, defense: 118, "special-attack": 78, "special-defense": 100, speed: 74 } },
];

// Stärke-Formel (identisch zu usePokemonData.computeStrength)
function computeStrength(stats) {
  const m = stats;
  return Math.round(
    (m.attack ?? 0) * 1.1 +
    (m["special-attack"] ?? 0) * 1.1 +
    (m.defense ?? 0) * 0.9 +
    (m["special-defense"] ?? 0) * 0.9 +
    (m.speed ?? 0) * 1.0 +
    (m.hp ?? 0) * 0.6
  );
}

// Bilder aus dem Desktop-Ordner (glob, Reihenfolge = Dateisystem)
const IMAGE_DIR = process.env.NASAMON_DIR || "~/Desktop/NasaMon";
const expand = (p) => (p.startsWith("~") ? join(process.env.HOME, p.slice(1)) : p);
const dir = expand(IMAGE_DIR);
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();

if (files.length !== CARDS.length) {
  console.warn(`WARN: ${files.length} Bilder gefunden, erwartet ${CARDS.length}.`);
}

console.log(`→ ${files.length} Bilder in ${dir}`);

async function run() {
  for (let i = 0; i < CARDS.length; i++) {
    const card = CARDS[i];
    const file = files[i];
    if (!file) { console.warn(`Übersprungen: kein Bild für ${card.name_en}`); continue; }

    const filePath = join(dir, file);
    const ext = file.split(".").pop().toLowerCase().replace("jpg", "jpeg");
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const storageKey = `${String(i + 1).padStart(2, "0")}-${card.name_en}.${ext}`;

    // Bild → Storage
    const buf = readFileSync(filePath);
    const { error: upErr } = await supabase.storage
      .from("nasamon")
      .upload(storageKey, buf, { contentType: mime, upsert: true });
    if (upErr) { console.error(`Upload ${storageKey} fehlgeschlagen:`, upErr.message); throw upErr; }

    const { data: urlData } = supabase.storage.from("nasamon").getPublicUrl(storageKey);

    // Datensatz → Tabelle
    const statsArr = Object.entries(card.stats).map(([name, value]) => ({ name, value }));
    const row = {
      id: i + 1,
      name_de: card.name_de,
      name_en: card.name_en,
      artwork: urlData.publicUrl,
      types: card.types,
      stats: statsArr,
      strength: computeStrength(card.stats),
      height: 12 + (i % 7) * 3,
      weight: 180 + (i % 9) * 40,
    };

    const { error: insErr } = await supabase.from("nasamon").upsert(row, { onConflict: "id" });
    if (insErr) { console.error(`Insert ${card.name_en} fehlgeschlagen:`, insErr.message); throw insErr; }

    console.log(`✓ ${row.id} ${card.name_de} (${row.strength}) → ${storageKey}`);
  }
  console.log("\nFERTIG: 18 NasaMon in Supabase Storage + Tabelle.");
}

run().catch((e) => { console.error(e); process.exit(1); });
