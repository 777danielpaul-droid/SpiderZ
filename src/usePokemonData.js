import { useCallback, useEffect, useRef, useState } from "react";
import { TOTAL_POKEMON } from "./pokemonList";

// In-Memory-Cache: verhindert Repeated-Fetch bei HMR/Reload des gleichen Sets.
const pokeCache = new Map();   // id -> pokemon basis
const nameCache = new Map();   // id -> deutscher name

// Staerke-Schaetzung aus den 6 Basis-Stats (gewichtet).
// Angriff/SpAngriff zaehlen mehr, HP etwas weniger -> kampfnaeher Wert.
// Ergebnis: Integer-Staerke (typisch ~220 bei schwach, ~520 bei stark).
function computeStrength(stats) {
  const map = {};
  for (const s of stats) map[s.name] = s.value;
  const raw =
    (map["attack"] ?? 0) * 1.1 +
    (map["special-attack"] ?? 0) * 1.1 +
    (map["defense"] ?? 0) * 0.9 +
    (map["special-defense"] ?? 0) * 0.9 +
    (map["speed"] ?? 0) * 1.0 +
    (map["hp"] ?? 0) * 0.6;
  return Math.round(raw);
}

// Nationaler Dex: 1..1025 (alle Haupt-Spiele, inkl. DE-Namen).
const MAX_POKEMON_ID = 1025;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchGermanName(id) {
  if (nameCache.has(id)) return nameCache.get(id);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!res.ok) throw new Error(`species ${id}: ${res.status}`);
  const d = await res.json();
  const de = d.names.find((n) => n.language.name === "de");
  const name = de ? de.name : d.name; // Fallback auf EN
  nameCache.set(id, name);
  return name;
}

async function fetchPokemon(id) {
  if (pokeCache.has(id)) return pokeCache.get(id);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error(`pokemon ${id}: ${res.status}`);
  const d = await res.json();
  const data = {
    id: d.id,
    name_en: d.name,
    artwork: d.sprites.other["official-artwork"].front_default,
    types: d.types.map((t) => t.type.name),
    stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    height: d.height, // in dm
    weight: d.weight, // in hg
  };
  pokeCache.set(id, data);
  return data;
}

// count zufällige eindeutige IDs aus dem gesamten nationalen Dex.
function randomIds(count = TOTAL_POKEMON, max = MAX_POKEMON_ID) {
  return shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, count);
}

// Such-Query -> gültige Pokemon-ID auflösen.
// Akzeptiert: reine Zahl (1..1025) ODER englischen Namen (PokeAPI nativ).
async function resolveQuery(raw) {
  const q = String(raw).trim().toLowerCase();
  if (!q) throw new Error("Bitte eine Nummer oder einen Namen eingeben.");

  if (/^\d+$/.test(q)) {
    const id = parseInt(q, 10);
    if (id < 1 || id > MAX_POKEMON_ID) {
      throw new Error(`Nummer außerhalb des Bereichs 1–${MAX_POKEMON_ID}.`);
    }
    return id;
  }

  // Englischer Name: PokeAPI löst /pokemon/{name} direkt auf.
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${q}`);
  if (res.ok) {
    const d = await res.json();
    return d.id;
  }
  throw new Error("Nicht gefunden – Nummer (1–1025) oder englischer Name (z.B. pikachu).");
}

export function usePokemonData(count = TOTAL_POKEMON) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  // Einzel-Suche (Header): { loading, result, error }
  const [search, setSearch] = useState({ loading: false, result: null, error: null });

  // IDs einmalig pro Mount ziehen (nicht bei jedem Render neu).
  const idsRef = useRef(null);
  if (idsRef.current === null) idsRef.current = randomIds(count);

  const loadIds = useCallback((ids) => {
    let cancelled = false;
    setError(null);
    setProgress(0);
    setData(null);
    (async () => {
      try {
        const results = [];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const [poke, deName] = await Promise.all([
            fetchPokemon(id),
            fetchGermanName(id),
          ]);
          results.push({ name_de: deName, strength: computeStrength(poke.stats), ...poke });
          if (!cancelled) setProgress(Math.round(((i + 1) / ids.length) * 100));
        }
        if (!cancelled) setData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Neue Runde: frische zufaellige IDs ziehen + neu laden.
  const reset = useCallback(() => {
    const ids = randomIds(count);
    idsRef.current = ids;
    loadIds(ids);
  }, [count, loadIds]);

  useEffect(() => loadIds(idsRef.current), [loadIds]);

  const runSearch = useCallback(async (query) => {
    setSearch({ loading: true, result: null, error: null });
    try {
      const id = await resolveQuery(query);
      const [poke, deName] = await Promise.all([
        fetchPokemon(id),
        fetchGermanName(id),
      ]);
      setSearch({ loading: false, result: { name_de: deName, strength: computeStrength(poke.stats), ...poke }, error: null });
    } catch (e) {
      setSearch({ loading: false, result: null, error: e.message });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch({ loading: false, result: null, error: null });
  }, []);

  return { data, error, progress, search, runSearch, clearSearch, reset };
}
