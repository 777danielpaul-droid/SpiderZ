import { useMemo, useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Gamification-HUD (Side-Panel, rechts, ohne Container):
 * - Jedes freigeschaltete (= beim Scrollen gesehene) Pokemon gibt XP.
 * - Level steigt alle 100 XP. Level-Namen geben dem Ganzen "Spiel"-Gefuehl.
 * - "Gefangen" = Anzahl freigeschalteter Pokemon (Pokeball-Zaehler).
 * - Flashiger Ladebalken: ein Segment pro Pokemon, zieht sich auf bei Reveal,
 *   mit Partikel-Burst + Glow-Puls pro aufgedecktem Pokemon.
 */
const LEVEL_TITLES = [
  "Rookie Trainer", "Pokedex Novice", "Field Scout", "Gym Hopeful",
  "Mid-Tier Trainer", "Elite Aspirant", "Type Master", "Battle Veteran",
  "Champion Challenger", "Pokemon Legend",
];

export default function HUD({ total, caughtIds, data, scrollFillRef, pulseRef, visible }) {
  const caught = caughtIds.length;
  const xp = caught * 50; // 50 XP pro freigeschaltetem Pokemon
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  // Challenge-Score: Gesamtstaerke aller gefangenen Pokemon.
  const teamStrength = useMemo(
    () => (data ? data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + (p.strength || 0), 0) : 0),
    [data, caughtIds]
  );

  const pctLevel = useMemo(() => (caught / total) * 100, [caught, total]);

  const badgeRef = useRef(null);
  const scoreRef = useRef(null);
  const barRef = useRef(null);   // Loadbar-Container (fuer Segment-Flash)
  const fxRef = useRef(null);    // Partikel-Container

  // pulseRef: App triggert Level-Up-Effekt ohne Re-Render.
  useEffect(() => {
    pulseRef.current = () => {
      gsap.fromTo(
        badgeRef.current,
        { scale: 1 },
        { scale: 1.35, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }
      );
      // Partikel-Burst am Badge
      const fx = fxRef.current;
      if (!fx) return;
      fx.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const p = document.createElement("span");
        p.className = "fx-spark";
        fx.appendChild(p);
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
        const dist = 36 + Math.random() * 46;
        gsap.fromTo(
          p,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            opacity: 0,
            scale: 0.3,
            duration: 0.65 + Math.random() * 0.3,
            ease: "power2.out",
            onComplete: () => p.remove(),
          }
        );
      }
    };
    return () => { pulseRef.current = null; };
  }, [pulseRef]);

  // Pro aufgedecktem Pokemon: Segment-Flash + Balken-Glow + Score-Puls
  useEffect(() => {
    if (!barRef.current) return;
    const seg = barRef.current.querySelector(`.load-seg[data-i="${caught - 1}"]`);
    if (seg) {
      gsap.fromTo(
        seg,
        { "--seg-glow": 1 },
        { "--seg-glow": 0, duration: 0.9, ease: "power2.out" }
      );
    }
    gsap.fromTo(
      barRef.current,
      { filter: "brightness(1.6)" },
      { filter: "brightness(1)", duration: 0.7, ease: "power2.out" }
    );
    if (scoreRef.current) {
      gsap.fromTo(
        scoreRef.current,
        { scale: 1.15, filter: "brightness(1.5)" },
        { scale: 1, filter: "brightness(1)", duration: 0.6, ease: "power2.out" }
      );
    }
    pulseRef.current?.();
  }, [caught]);

  return (
    <div className={`hud${visible ? " hud-visible" : ""}`}>
      <div className="hud-score" ref={scoreRef}>
        <span className="hud-score-label mono-label">TEAM-STÄRKE</span>
        <span className="hud-score-val">{teamStrength}</span>
      </div>

      <div className="hud-badge mono-label" ref={badgeRef}>
        <span className="hud-label">LEVEL</span>
        <span className="hud-level">{level}</span>
        <div className="hud-fx" ref={fxRef} />
      </div>

      <div className="hud-title">{title}</div>

      <div className="hud-caught">
        <span className="ball">●</span> {caught}/{total} gefangen
      </div>

      <div className="loadbar" ref={barRef}>
        <div className="loadbar-track">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              data-i={i}
              className={`load-seg${i < caught ? " is-lit" : ""}`}
            />
          ))}
        </div>
        <div className="loadbar-fill" style={{ width: `${xpInLevel}%` }} />
        <span className="hud-bar-text">XP {xp} · {xpInLevel}/100 → Lv {level + 1}</span>
      </div>

      <div className="hud-scroll">
        <div className="hud-scroll-fill" ref={scrollFillRef} style={{ width: "0%" }} />
      </div>
    </div>
  );
}
