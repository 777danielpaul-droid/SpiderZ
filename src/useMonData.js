import { useCallback, useEffect, useRef, useState } from "react";
import { TOTAL_MON } from "./monList";
import { supabase, isSupabaseReady } from "./lib/supabase";

// In-Memory-Cache: verhindert Repeated-Fetch bei HMR/Reload des gleichen Sets.
const cache = new Map(); // id -> nasamon datensatz

// Wenn keine Supabase-Credentials da sind (z.B. Pages ohne Secrets),
// direkt einen klaren Fehler liefern statt auf null.from() zu crashen.
const NO_SUPABASE = "SpiderZ braucht eine Supabase-Verbindung. Bitte .env konfigurieren.";

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

// Liefert einen zufälligen Datensatz aus dem Cache (oder null).
function getCached(id) {
  return cache.get(id) || null;
}

async function fetchNasaMon(id) {
  if (!isSupabaseReady) throw new Error(NO_SUPABASE);
  if (cache.has(id)) return cache.get(id);
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
  // Bester Treffer = kuerzester Name (exakteste Uebereinstimmung).
  if (!isSupabaseReady) throw new Error(NO_SUPABASE);
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
          const mon = await fetchNasaMon(ids[i]);
          // Shape 1:1 wie vorher: { id, name_en, name_de, artwork, types, strength, stats, height, weight }
          results.push(mon);
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

  // Alle 18 Spider (unabhängig vom 3er-Team) fuer die Arena/RNG-Gegner.
  const [allData, setAllData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        for (let id = 1; id <= MAX_NASAMON; id++) {
          all.push(await fetchNasaMon(id));
        }
        if (!cancelled) setAllData(all);
      } catch {
        /* nicht kritisch fuer das Hauptspiel */
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

  return { data, error, progress, search, runSearch, clearSearch, reset, allData };
}
