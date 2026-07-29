import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./lib/auth.jsx";
import { getSupabase, isSupabaseReady } from "./lib/supabase";

/* ============================================================
   BoosterOpen — Modal mit Booster-Animation.
   Wird nach Spielgewinn gezeigt: öffnet einen Booster und
   schaltet eine zufällige locked Spider frei.

   Props:
     onClose   — wird nach Abschluss aufgerufen
     onUnlock  — (spider) callback wenn eine Spinne freigeschaltet wurde

   Flow:
     1. User sieht Booster-Pack → klickt zum Öffnen
     2. Animation (Pack-Pop + Burst + Flakes)
     3. Karte wird enthüllt → Spinne freigeschaltet
     4. onUnlock(spider) → Dex updatet sich
   ============================================================ */

const RARITY_COLORS = {
  common: "#22d3ee",   // cyan
  rare: "#ff35d0",     // magenta
  legendary: "#b6ff3b", // lime
};

export default function BoosterOpen({ onClose, onUnlock }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState("idle"); // idle | opening | revealed
  const [unlockedSpider, setUnlockedSpider] = useState(null);
  const [error, setError] = useState(null);

  // Booster öffnen: wähle zufällige locked Spider + freischalten
  const openBooster = useCallback(async () => {
    if (phase !== "idle" || !isSupabaseReady || !user) return;

    setPhase("opening");
    setError(null);

    try {
      const supabase = getSupabase();

      // Alle locked Spider (available=false) die der User NOCH nicht hat
      const { data: lockedSpiders, error: fetchErr } = await supabase
        .from("nasamon")
        .select("id, name_de, name_en, artwork, types, rarity, available")
        .eq("available", false)
        .not("id", "in", `(${await getUserUnlockedIds(supabase, user.id)})`);

      if (fetchErr) throw fetchErr;

      if (!lockedSpiders || lockedSpiders.length === 0) {
        // Alle Spider bereits freigeschaltet
        setUnlockedSpider({ name_de: "Alle Spider gefunden!", name_en: "Complete" });
        setPhase("revealed");
        setTimeout(() => onClose?.(), 3000);
        return;
      }

      // Zufällige Spinne wählen
      const spider = lockedSpiders[Math.floor(Math.random() * lockedSpiders.length)];

      // In user_unlocks eintragen (upsert verhindert duplicate key)
      const { error: unlockErr } = await supabase
        .from("user_unlocks")
        .upsert({ user_id: user.id, spider_id: spider.id });

      if (unlockErr) throw unlockErr;

      setUnlockedSpider(spider);
      setPhase("revealed");

      // Callback für Dex-Update
      if (onUnlock) onUnlock(spider);

    } catch (err) {
      console.error("[booster] Fehler:", err.message);
      setError(err.message || "Fehler beim Öffnen des Boosters.");
      setPhase("idle");
    }
  }, [phase, user]);

  // Hilfsfunktion: IDs der bereits freigeschalteten Spider holen
  async function getUserUnlockedIds(supabase, userId) {
    const { data, error } = await supabase
      .from("user_unlocks")
      .select("spider_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("[booster] konnte unlocks nicht laden:", error.message);
      return [];
    }
    return (data || []).map((row) => row.spider_id);
  }

  // Escape schließt nach Reveal
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && phase === "revealed") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, onClose]);

  return (
    <div className="booster-modal" role="dialog" aria-modal="true" aria-label="Booster öffnen">
      <div className={`booster-stage ${phase === "opening" ? "opening" : ""} ${phase === "revealed" ? "revealed" : ""}`}>
        {/* Booster-Pack */}
        <div
          className={`booster-pack ${phase === "opening" ? "opening" : ""}`}
          onClick={phase === "idle" ? openBooster : undefined}
          role={phase === "idle" ? "button" : undefined}
          aria-label={phase === "idle" ? "Booster öffnen" : undefined}
          tabIndex={phase === "idle" ? 0 : -1}
          onKeyDown={phase === "idle" ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBooster(); } } : undefined}
        >
          <div className="booster-pack-body">
            <div className="booster-pack-perf"></div>
            <div className="booster-pack-top"></div>
            <div className="booster-pack-foil"></div>
            <div className="booster-pack-logo">
              <div className="booster-big">SPIDER<span>Z</span></div>
              <div className="booster-sub">BOOSTER</div>
            </div>
          </div>
        </div>

        {/* Burst-Effekt */}
        <div className={`booster-burst ${phase === "opening" ? "active" : ""}`}>
          <svg viewBox="0 0 200 200">
            <g fill="none" stroke="url(#booster-gradient)" strokeWidth="3">
              <defs>
                <linearGradient id="booster-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#ff35d0" />
                </linearGradient>
              </defs>
              <path d="M100 10 L100 60 M100 140 L100 190 M10 100 L60 100 M140 100 L190 100 M37 37 L73 73 M127 127 L163 163 M163 37 L127 73 M73 127 L37 163" />
            </g>
          </svg>
        </div>

        {/* Entdeckte Karte */}
        {phase === "revealed" && unlockedSpider && (
          <div className="booster-card revealed">
            <div className="booster-card-icon">
              {unlockedSpider.artwork ? (
                <img src={unlockedSpider.artwork} alt={unlockedSpider.name_de} />
              ) : (
                "🕷️"
              )}
            </div>
            <div className="booster-card-label">{unlockedSpider.name_de || unlockedSpider.name_en}</div>
            <div
              className="booster-card-rarity"
              style={{ color: RARITY_COLORS[unlockedSpider.rarity] || RARITY_COLORS.common }}
            >
              {unlockedSpider.rarity?.toUpperCase() || "FREIGESCHALTET"}
            </div>
          </div>
        )}

        {/* Hint */}
        {phase === "idle" && (
          <div className="booster-hint">TIPPE ZUM ÖFFNEN</div>
        )}

        {/* Fehler */}
        {error && <div className="booster-error">{error}</div>}

        {/* Zurück-Button (immer sichtbar) */}
        <button
          type="button"
          className="booster-back"
          onClick={onClose}
          aria-label="Zurück"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
