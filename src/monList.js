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
