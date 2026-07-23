import { useCallback, useEffect, useRef, useState } from "react";
import { TOTAL_POKEMON } from "./pokemonList";

// In-Memory-Cache: verhindert Repeated-Fetch bei HMR/Reload des gleichen Sets.
const pokeCache = new Map();   // id -> pokemon basis
const nameCache = new Map();   // id -> deutscher name

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = [];
        for (let i = 0; i < idsRef.current.length; i++) {
          const id = idsRef.current[i];
          const [poke, deName] = await Promise.all([
            fetchPokemon(id),
            fetchGermanName(id),
          ]);
          results.push({ name_de: deName, ...poke });
          if (!cancelled) setProgress(Math.round(((i + 1) / idsRef.current.length) * 100));
        }
        if (!cancelled) setData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback(async (query) => {
    setSearch({ loading: true, result: null, error: null });
    try {
      const id = await resolveQuery(query);
      const [poke, deName] = await Promise.all([
        fetchPokemon(id),
        fetchGermanName(id),
      ]);
      setSearch({ loading: false, result: { name_de: deName, ...poke }, error: null });
    } catch (e) {
      setSearch({ loading: false, result: null, error: e.message });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch({ loading: false, result: null, error: null });
  }, []);

  return { data, error, progress, search, runSearch, clearSearch };
}
