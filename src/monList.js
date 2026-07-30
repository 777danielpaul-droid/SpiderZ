// Typ-Farben (Light-Mode freundlich, lila als Akzent).
export const TOTAL_MON = 3; // zufällige Auswahl aus dem nationalen Dex (1..1025)
export const TOTAL_COLLECTORS = 10; // maximale Collector-Items die gesammelt werden können

export const TYPE_COLORS = {
  normal:  "#9fa19f",
  fire:    "#ff6f3c",
  water:   "#3ca7ff",
  electric:"#ffd23c",
  grass:   "#5ed94f",
  ice:     "#7fd4e8",
  fighting:"#d65a4f",
  poison:  "#a85cd6",
  ground:  "#e0b15a",
  flying:  "#8fb8f0",
  psychic: "#ff6fa3",
  bug:     "#9bd14f",
  rock:    "#c9a86a",
  ghost:   "#7a5fd6",
  dragon:  "#5f6fff",
  dark:    "#5a5366",
  steel:   "#9fb0c0",
  fairy:   "#ff9ed6",
};

/** Durchschnitt der Basis-Stats (fallback: strength, wenn keine stats-Array) */
export function avgStat(mon) {
  const arr = (mon.stats || []).map((s) => s.value);
  const sum = arr.length ? arr.reduce((a, b) => a + b, 0) : (mon.strength || 0);
  const n = arr.length || 1;
  return Math.round(sum / n);
}

// Lokaler Fallback-Datensatz (für Offline-Modus ohne Supabase).
// 3 Spider mit verschiedenen Typen-Fraktionen (GIFT / STÄRKE / VERTEIDIGUNG).
const BASE = typeof import.meta !== "undefined" ? import.meta.env.BASE_URL : "/SpiderZ/";
export const FALLBACK_MONS = [
  {
    id: 1, name_de: "Arachnex", name_en: "Arachnex",
    types: ["gift"], strength: 85, height: 7, weight: 15,
    artwork: `${BASE}assets/arachnex.png`,
    stats: [
      { name: "ANGRIFF", value: 92 },
      { name: "VERTEIDIGUNG", value: 68 },
      { name: "GESCHWINDIGKEIT", value: 76 },
    ],
  },
  {
    id: 2, name_de: "Neonarach", name_en: "Neonarach",
    types: ["stärk"], strength: 112, height: 11, weight: 28,
    artwork: `${BASE}assets/neonarach.png`,
    stats: [
      { name: "ANGRIFF", value: 118 },
      { name: "VERTEIDIGUNG", value: 82 },
      { name: "GESCHWINDIGKEIT", value: 94 },
    ],
  },
  {
    id: 3, name_de: "Toxipede", name_en: "Toxipede",
    types: ["gift", "verteidigung"], strength: 74, height: 9, weight: 22,
    artwork: `${BASE}assets/toxipede.png`,
    stats: [
      { name: "ANGRIFF", value: 66 },
      { name: "VERTEIDIGUNG", value: 94 },
      { name: "GESCHWINDIGKEIT", value: 58 },
    ],
  },
];
