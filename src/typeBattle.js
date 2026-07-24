// Schere/Stein/Papier-Typen-Logik für SpiderZ-Kämpfe.
// Jeder vorkommende Typ wird einer SSP-Fraktion zugeordnet.
// Zyklus: SCHERE > PAPIER > STEIN > SCHERE (klassisch).

export const FACTION = { SCHERE: "SCHERE", PAPIER: "PAPIER", STEIN: "STEIN" };

// Mapping Typ -> Fraktion (anpassbar, zentrale Stelle).
const TYPE_FACTION = {
  // SCHERE = Angriff
  bug: FACTION.SCHERE,
  dark: FACTION.SCHERE,
  poison: FACTION.SCHERE,
  fighting: FACTION.SCHERE,
  // STEIN = Verteidigung
  steel: FACTION.STEIN,
  ground: FACTION.STEIN,
  water: FACTION.STEIN,
  // PAPIER = Spezial
  flying: FACTION.PAPIER,
  fire: FACTION.PAPIER,
  electric: FACTION.PAPIER,
  psychic: FACTION.PAPIER,
  ghost: FACTION.PAPIER,
  fairy: FACTION.PAPIER,
};

// Jede Fraktion schlägt genau eine andere (zyklisch).
const BEATS = {
  [FACTION.SCHERE]: FACTION.PAPIER,
  [FACTION.PAPIER]: FACTION.STEIN,
  [FACTION.STEIN]: FACTION.SCHERE,
};

export const BONUS = 100;

// Liefert die Fraktion eines Typs (oder null, wenn unbekannt).
export function factionOf(type) {
  return TYPE_FACTION[type] || null;
}

// Hat `a` (Typ) einen Typ-Vorteil gegen `b` (Typ)?
// Prüft beide Typen jeder Seite: einer reicht für Vorteil.
export function hasAdvantage(typesA = [], typesB = []) {
  const fa = typesA.map(factionOf).filter(Boolean);
  const fb = typesB.map(factionOf).filter(Boolean);
  if (!fa.length || !fb.length) return false;
  return fa.some((x) => fb.some((y) => BEATS[x] === y));
}

// Liefert die Fraktion mit Vorteil für Anzeige (erster Treffer), sonst null.
export function advantageFaction(typesA = [], typesB = []) {
  const fa = typesA.map(factionOf).filter(Boolean);
  const fb = typesB.map(factionOf).filter(Boolean);
  const hit = fa.find((x) => fb.some((y) => BEATS[x] === y));
  return hit || null;
}

// Einzel-Match auflösen: 1:1, Typ-Vorteil = +100 Stärke-Bonus.
// Gibt { winner: 'a'|'b', bonusA, bonusB, valueA, valueB, hasTypeWin } zurück.
export function resolveMatch(a, b) {
  const bonusA = hasAdvantage(a.types, b.types) ? BONUS : 0;
  const bonusB = hasAdvantage(b.types, a.types) ? BONUS : 0;
  const valueA = (a.strength || 0) + bonusA;
  const valueB = (b.strength || 0) + bonusB;
  const winner = valueA === valueB ? "draw" : valueA > valueB ? "a" : "b";
  return {
    winner,
    bonusA,
    bonusB,
    valueA,
    valueB,
    // true, wenn der Gewinner durch reinen Typ-Vorteil (und nicht Stärke) gewinnt
    hasTypeWin:
      (winner === "a" && bonusA > 0 && a.strength <= b.strength) ||
      (winner === "b" && bonusB > 0 && b.strength <= a.strength),
  };
}
