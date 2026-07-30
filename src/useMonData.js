import { useCallback, useEffect, useRef, useState } from "react";
import { TOTAL_MON, FALLBACK_MONS } from "./monList";
import { supabase, isSupabaseReady } from "./lib/supabase";

// In-Memory-Cache: verhindert Repeated-Fetch bei HMR/Reload des gleichen Sets.
const cache = new Map(); // id -> nasamon datensatz

// Gesamtzahl der eigenen Monster (aus der DB; hier als Obergrenze für randomIds).
const MAX_NASAMON = 18;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Offline-Fallback: lokale Spider aus monList.js verwenden
function fallbackMon(id) {
  const mon = FALLBACK_MONS.find((m) => m.id === id);
  if (mon) return { ...mon };
  // Falls ID nicht in Fallback-Daten: generiere zufälliges Monster
  const template = FALLBACK_MONS[Math.floor(Math.random() * FALLBACK_MONS.length)];
  return { ...template, id, name_de: `Spider#${id}` };
}

async function fetchNasaMon(id) {
  if (cache.has(id)) return cache.get(id);

  // Offline-Modus: keine Supabase-Verbindung -> Fallback-Daten
  if (!isSupabaseReady) {
    const mon = fallbackMon(id);
    cache.set(id, mon);
    return mon;
  }

  const { data, error } = await supabase
    .from("nasamon")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`nasamon ${id}: ${error.message}`);
  cache.set(id, data);
  return data;
}

// count zufällige eindeutige IDs aus dem gesamten NasaMon-Dex.
function randomIds(count = TOTAL_MON, max = MAX_NASAMON) {
  return shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, count);
}

// Such-Query -> gültige NasaMon-ID auflösen.
// Akzeptiert: reine Zahl (1..18) ODER englischer Name (name_en).
async function resolveQuery(raw) {
  const q = String(raw).trim().toLowerCase();
  if (!q) throw new Error("Bitte eine Nummer oder einen Namen eingeben.");

  if (/^\d+$/.test(q)) {
    const id = parseInt(q, 10);
    if (id < 1 || id > MAX_NASAMON) {
      throw new Error(`Nummer außerhalb des Bereichs 1–${MAX_NASAMON}.`);
    }
    return id;
  }

  // Name-Suche: Teilnamen via Wildcards (z.B. "arach" -> "arachnex").
  // Offline: in Fallback-Daten suchen
  if (!isSupabaseReady) {
    const best = FALLBACK_MONS.find((m) => m.name_en.toLowerCase().includes(q));
    if (best) return best.id;
    throw new Error(`Nicht gefunden – Nummer (1–${MAX_NASAMON}) oder Name.`);
  }

  // Bester Treffer = kürzester Name (exakteste Übereinstimmung).
  const { data, error } = await supabase
    .from("nasamon")
    .select("id, name_en")
    .ilike("name_en", `%${q}%`)
    .limit(5);
  if (error) throw new Error(`Suche fehlgeschlagen: ${error.message}`);
  if (data && data.length) {
    const best = data.slice().sort((a, b) => a.name_en.length - b.name_en.length)[0];
    return best.id;
  }
  throw new Error(`Nicht gefunden – Nummer (1–${MAX_NASAMON}) oder Name (z.B. arachnex, spider, glow).`);
}

export function useMonData(count = TOTAL_MON) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Einzel-Suche (Header): { loading, result, error }
  const [search, setSearch] = useState({ loading: false, result: null, error: null });

  // IDs einmalig pro Mount ziehen (nicht bei jedem Render neu).
  const idsRef = useRef(null);
  if (idsRef.current === null) idsRef.current = randomIds(count);

  const loadIds = useCallback((ids) => {
    let cancelled = false;
    setError(null);
    setData(null);
    (async () => {
      try {
        // Parallel laden (Promise.all statt sequenziell)
        const results = await Promise.all(ids.map((id) => fetchNasaMon(id)));
        if (!cancelled) setData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Neue Runde: frische zufällige IDs ziehen + neu laden.
  const reset = useCallback(() => {
    const ids = randomIds(count);
    idsRef.current = ids;
    loadIds(ids);
  }, [count, loadIds]);

  useEffect(() => loadIds(idsRef.current), [loadIds]);

  // Alle Spider (unabhängig vom 3er-Team) für die Arena/RNG-Gegner.
  const [allData, setAllData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Offline: Fallback-Daten für alle 18 Spider generieren
        if (!isSupabaseReady) {
          const all = Array.from({ length: MAX_NASAMON }, (_, i) => fetchNasaMon(i + 1));
          const results = await Promise.all(all);
          if (!cancelled) setAllData(results);
          return;
        }
        // Alle 18 Spider parallel laden (statt sequenziell)
        const all = await Promise.all(
          Array.from({ length: MAX_NASAMON }, (_, i) => fetchNasaMon(i + 1))
        );
        if (!cancelled) setAllData(all);
      } catch {
        /* nicht kritisch für das Hauptspiel */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback(async (query) => {
    setSearch({ loading: true, result: null, error: null });
    try {
      const id = await resolveQuery(query);
      const mon = await fetchNasaMon(id);
      setSearch({ loading: false, result: mon, error: null });
    } catch (e) {
      setSearch({ loading: false, result: null, error: e.message });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch({ loading: false, result: null, error: null });
  }, []);

  return { data, error, search, runSearch, clearSearch, reset, allData };
}
