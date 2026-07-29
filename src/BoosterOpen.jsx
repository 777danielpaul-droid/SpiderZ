import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./lib/auth.jsx";
import { getSupabase, isSupabaseReady } from "./lib/supabase";

/* ============================================================
   BoosterOpen — Modal mit Booster-Animation.
   Wird nach Spielgewinn gezeigt: öffnet einen Booster und
   schenkt eine zufällige Item (Spider, Steroide, Collector-Item).

   Props:
     onClose   — wird nach Abschluss aufgerufen
     onUnlock  — (item) callback wenn ein Item gefunden wurde

   Item-Typen:
     - spider:     neue Spider wird freigeschaltet (30%)
     - steroid:    +1 Steroid im Inventar (60%)
     - collector:  Sammler-Item (10%)

   Flow:
     1. User sieht Booster-Pack → klickt zum Öffnen
     2. Animation (Pack-Pop + Burst + Flakes)
     3. Karte wird enthüllt → Item wird verliehen
     4. onUnlock(item) → Inventar/Dex updatet sich
   ============================================================ */

const RARITY_COLORS = {
  common: "#22d3ee",   // cyan
  rare: "#ff35d0",     // magenta
  legendary: "#b6ff3b", // lime
};

const ITEM_ICONS = {
  spider: "🕷️",
  steroid: "💉",
  collector: "🏆",
};

export default function BoosterOpen({ onClose, onUnlock }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState("idle"); // idle | opening | revealed
  const [unlockedItem, setUnlockedItem] = useState(null);
  const [error, setError] = useState(null);

  // Booster öffnen: wähle zufälliges Item
  const openBooster = useCallback(async () => {
    if (phase !== "idle" || !isSupabaseReady || !user) return;

    setPhase("opening");
    setError(null);

    try {
      const supabase = getSupabase();

      // 1. Prüfe ob locked Spider verfügbar sind
      const { data: lockedSpiders, error: fetchErr } = await supabase
        .from("nasamon")
        .select("id, name_de, name_en, artwork, types, rarity, available")
        .eq("available", false)
        .not("id", "in", `(${await getUserUnlockedIds(supabase, user.id)})`);

      if (fetchErr) throw fetchErr;

      // 2. Zufälliges Item wählen (30% Spider, 60% Steroid, 10% Collector)
      const roll = Math.random();
      let itemType;

      if (roll < 0.3 && lockedSpiders && lockedSpiders.length > 0) {
        itemType = "spider";
      } else if (roll < 0.9) {
        itemType = "steroid";
      } else {
        itemType = "collector";
      }

      // 3. Item verarbeiten
      let item;
      if (itemType === "spider" && lockedSpiders && lockedSpiders.length > 0) {
        // Spider freischalten
        const spider = lockedSpiders[Math.floor(Math.random() * lockedSpiders.length)];
        const { error: unlockErr } = await supabase
          .from("user_unlocks")
          .upsert({ user_id: user.id, spider_id: spider.id });

        if (unlockErr) throw unlockErr;

        item = { type: "spider", ...spider };
      } else if (itemType === "steroid") {
        // Steroid zum Inventar hinzufügen
        const { data: saveData, error: saveErr } = await supabase
          .from("user_saves")
          .select("steroids")
          .eq("user_id", user.id)
          .maybeSingle();

        if (saveErr) throw saveErr;

        const currentSteroids = saveData?.steroids || 0;
        const { error: updateErr } = await supabase
          .from("user_saves")
          .upsert({
            user_id: user.id,
            steroids: currentSteroids + 1,
          }, { onConflict: "user_id" });

        if (updateErr) throw updateErr;

        item = { type: "steroid", name_de: "STEROID-VIAL", rarity: "rare" };
      } else {
        // Collector-Item (Sammler-Item)
        item = { type: "collector", name_de: "COLLECTOR'S ITEM", rarity: "legendary" };
      }

      setUnlockedItem(item);
      setPhase("revealed");

      // Callback für Inventar/Dex-Update
      if (onUnlock) onUnlock(item);

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
        {phase === "revealed" && unlockedItem && (
          <div className={`booster-card revealed type-${unlockedItem.type}`}>
            <div className="booster-card-icon">
              {unlockedItem.type === "spider" && unlockedItem.artwork ? (
                <img src={unlockedItem.artwork} alt={unlockedItem.name_de} />
              ) : (
                ITEM_ICONS[unlockedItem.type] || "🕷️"
              )}
            </div>
            <div className="booster-card-label">{unlockedItem.name_de || unlockedItem.name_en}</div>
            <div
              className="booster-card-rarity"
              style={{ color: RARITY_COLORS[unlockedItem.rarity] || RARITY_COLORS.common }}
            >
              {unlockedItem.rarity?.toUpperCase() || "FREIGESCHALTET"}
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
