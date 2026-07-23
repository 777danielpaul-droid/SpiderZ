import { useMemo, useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Gamification-HUD:
 * - Jedes freigeschaltete (= beim Scrollen gesehene) Pokemon gibt XP.
 * - Level steigt alle 100 XP. Level-Namen geben dem Ganzen "Spiel"-Gefuehl.
 * - "Gefangen" = Anzahl freigeschalteter Pokemon (Pokeball-Zaehler).
 * - Bei Level-Up: Pulse + Partikel-Burst (App ruft pulseRef.current() auf).
 */
const LEVEL_TITLES = [
  "Rookie Trainer", "Pokedex Novice", "Field Scout", "Gym Hopeful",
  "Mid-Tier Trainer", "Elite Aspirant", "Type Master", "Battle Veteran",
  "Champion Challenger", "Pokemon Legend",
];

export default function HUD({ total, caughtIds, scrollFillRef, pulseRef }) {
  const caught = caughtIds.length;
  const xp = caught * 50; // 50 XP pro freigeschaltetem Pokemon
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const pctLevel = useMemo(() => (caught / total) * 100, [caught, total]);

  const badgeRef = useRef(null);
  const fxRef = useRef(null); // Container fuer Partikel

  // pulseRef: App triggert Level-Up-Effekt ohne Re-Render.
  useEffect(() => {
    pulseRef.current = () => {
      // Badge-Puls
      gsap.fromTo(
        badgeRef.current,
        { scale: 1 },
        { scale: 1.35, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }
      );
      // Partikel-Burst
      const fx = fxRef.current;
      if (!fx) return;
      fx.innerHTML = "";
      for (let i = 0; i < 14; i++) {
        const p = document.createElement("span");
        p.className = "fx-particle";
        fx.appendChild(p);
        const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
        const dist = 40 + Math.random() * 50;
        gsap.fromTo(
          p,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            opacity: 0,
            scale: 0.3,
            duration: 0.7 + Math.random() * 0.3,
            ease: "power2.out",
            onComplete: () => p.remove(),
          }
        );
      }
    };
    return () => { pulseRef.current = null; };
  }, [pulseRef]);

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-badge" ref={badgeRef}>
          <span className="hud-label mono-label">LEVEL</span>
          <span className="hud-level">{level}</span>
          <div className="hud-fx" ref={fxRef} />
        </div>
        <div className="hud-title">{title}</div>
        <div className="hud-caught">
          <span className="ball">●</span> {caught}/{total} gefangen
        </div>
      </div>

      <div className="hud-bar">
        <div className="hud-bar-fill" style={{ width: `${xpInLevel}%` }} />
        <span className="hud-bar-text">XP {xp} · {xpInLevel}/100 bis Level {level + 1}</span>
      </div>

      <div className="hud-scroll">
        <div className="hud-scroll-fill" ref={scrollFillRef} style={{ width: "0%" }} />
      </div>
    </div>
  );
}
