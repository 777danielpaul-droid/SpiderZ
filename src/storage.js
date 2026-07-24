// Persistente Sammlung + Rekorde (localStorage, kein Backend).
const DEX_KEY = "pc_dex";            // Array aller je gefangenen Pokemon (dedupe nach id)
const BEST_KEY = "pc_bestTeamStrength"; // hoechste Team-Staerke einer Runde

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

// Alle bisher gefangenen (dedupe nach id, neueste Staerke gewinnt).
export function loadDex() {
  if (typeof localStorage === "undefined") return [];
  const arr = safeParse(localStorage.getItem(DEX_KEY), []);
  return Array.isArray(arr) ? arr : [];
}

// Gefangene einer Runde hinzufuegen. pokemon: {id,name_de,types,artwork,strength}
export function saveCaught(caught) {
  if (typeof localStorage === "undefined" || !caught.length) return;
  const map = new Map(loadDex().map((p) => [p.id, p]));
  for (const p of caught) if (p && p.id) map.set(p.id, p);
  const next = [...map.values()].sort((a, b) => a.id - b.id);
  localStorage.setItem(DEX_KEY, JSON.stringify(next));
}

export function loadBestTeamStrength() {
  if (typeof localStorage === "undefined") return 0;
  const v = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

export function saveBestTeamStrength(value) {
  if (typeof localStorage === "undefined") return;
  const cur = loadBestTeamStrength();
  if (value > cur) localStorage.setItem(BEST_KEY, String(value));
}
