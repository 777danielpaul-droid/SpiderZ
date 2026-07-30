import { useEffect, useState } from "react";
import { loadDex } from "./storage";
import { TYPE_COLORS } from "./monList";
import { useAuth } from "./lib/auth.jsx";
import { getSupabase, isSupabaseReady } from "./lib/supabase";

const RARITY_COLORS = {
  common: "#22d3ee",   // cyan
  rare: "#ff35d0",     // magenta
  legendary: "#b6ff3b", // lime
};

/**
 * DexOverlay: listet alle Spider auf — gefangen + locked.
 * - Gefangene Spider aus localStorage (offline-first)
 * - Alle Spider aus Supabase (mit available + user_unlocks)
 * - Locked Spider sind ausgegraut (disabled)
 */
export default function DexOverlay({ onClose }) {
  const { user } = useAuth();
  const localDex = loadDex();
  const [allSpiders, setAllSpiders] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(isSupabaseReady);

  // Alle Spider + User-Entdeckungen laden
  useEffect(() => {
    if (!isSupabaseReady || !user) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let active = true;

    (async () => {
      // 1) Alle Spider aus DB laden
      const { data: spiders, error: spidersErr } = await supabase
        .from("nasamon")
        .select("id, name_de, name_en, artwork, types, strength, rarity, available")
        .order("id");

      if (spidersErr) {
        console.warn("[dex] konnte Spider nicht laden:", spidersErr.message);
        setLoading(false);
        return;
      }

      // 2) User-Entdeckungen laden
      const { data: unlocks, error: unlocksErr } = await supabase
        .from("user_unlocks")
        .select("spider_id")
        .eq("user_id", user.id);

      if (unlocksErr) {
        console.warn("[dex] konnte unlocks nicht laden:", unlocksErr.message);
      }

      if (!active) return;

      setAllSpiders(spiders || []);
      setUnlockedIds(new Set((unlocks || []).map((u) => u.spider_id)));
      setLoading(false);
    })();

    return () => { active = false; };
  }, [user]);

  // Bestimme ob eine Spinne gefangen/gefreigeschaltet ist
  const isCaught = (id) => localDex.some((p) => p.id === id);
  const isUnlocked = (id) => unlockedIds.has(id);
  const isAvailable = (spider) => spider.available || isUnlocked(spider.id) || isCaught(spider.id);

  // Sortiere: gefangene zuerst, dann freigeschaltete, dann locked
  const sortedSpiders = [...allSpiders].sort((a, b) => {
    const aCaught = isCaught(a.id) ? 0 : isUnlocked(a.id) ? 1 : a.available ? 2 : 3;
    const bCaught = isCaught(b.id) ? 0 : isUnlocked(b.id) ? 1 : b.available ? 2 : 3;
    if (aCaught !== bCaught) return aCaught - bCaught;
    return a.id - b.id;
  });

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <span className="holo-glass" aria-hidden="true"></span>
      <div className="overlay-panel overlay-panel-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="overlay-close" onClick={onClose} aria-label="Zurück">←</button>
        <h2 className="overlay-title">NASAMON-DEX</h2>

        {loading ? (
          <p className="overlay-empty">Lade Spider…</p>
        ) : sortedSpiders.length === 0 && localDex.length === 0 ? (
          <p className="overlay-empty">Noch keine Monster gefangen. Fang eine Runde an!</p>
        ) : (
          <div className="dex-grid">
            {/* Lokale (gefangene) Spider */}
            {localDex.map((p) => {
              const primary = p.types && p.types[0];
              const tc = primary ? TYPE_COLORS[primary] : "#6d28d9";
              return (
                <div className="dex-card dex-card-caught" key={p.id} style={{ "--tc": tc }}>
                  <img className="dex-img" src={p.artwork} alt={p.name_de} loading="lazy" />
                  <div className="dex-meta">
                    <div className="dex-num">#{String(p.id).padStart(3, "0")}</div>
                    <div className="dex-name">{p.name_de}</div>
                    <div className="dex-str">STÄRKE {p.strength}</div>
                    <div className="dex-types">
                      {(p.types || []).map((t) => (
                        <span key={t} className="dex-type" style={{ background: TYPE_COLORS[t] }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Alle Spider aus DB (mit locked-Status) */}
            {sortedSpiders.map((spider) => {
              const caught = isCaught(spider.id);
              const available = isAvailable(spider);
              const locked = !available;

              // Wenn schon gefangen, überspringen (kommt aus localDex)
              if (caught) return null;

              const primary = spider.types && spider.types[0];
              const tc = primary ? TYPE_COLORS[primary] : "#6d28d9";

              return (
                <div
                  className={`dex-card ${locked ? "dex-card-locked" : "dex-card-unlocked"}`}
                  key={spider.id}
                  style={{ "--tc": tc }}
                >
                  <img
                    className={`dex-img ${locked ? "dex-img-locked" : ""}`}
                    src={spider.artwork}
                    alt={spider.name_de}
                    loading="lazy"
                  />
                  <div className="dex-meta">
                    <div className="dex-num">#{String(spider.id).padStart(3, "0")}</div>
                    <div className="dex-name">{spider.name_de}</div>
                    <div className="dex-str">STÄRKE {spider.strength}</div>
                    {locked && <div className="dex-locked-badge">🔒 GESCHLOSSEN</div>}
                    {spider.rarity && (
                      <div className="dex-rarity" style={{ color: RARITY_COLORS[spider.rarity] || "#22d3ee" }}>
                        {spider.rarity.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
