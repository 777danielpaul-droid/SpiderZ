import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";

/**
 * Gamification-HUD (Side-Panel, rechts, ohne Container):
 * - Grosse "TEAM-STÄRKE"-Score-Zahl = Summe der Basis-Staerke aller gefangenen
 *   Pokemon. Das ist die zu knackende Challenge-Zahl.
 * - "Gefangen" = Anzahl freigeschalteter Pokemon (Pokeball-Zaehler).
 * - Flashige Loadbar: ein Segment pro Pokemon, leuchtet beim Reveal auf.
 * - Reward-Pop beim Aufdecken: Score zaehlt animiert hoch, Partikel-Burst,
 *   aufsteigender "+STÄRKE n"-Toast -> belohnendes "Level-Up"-Gefuehl.
 */
export default function HUD({ total, caughtIds, data, scrollFillRef, pulseRef, visible }) {
  const caught = caughtIds.length;

  // Challenge-Score: Gesamtstaerke aller gefangenen Pokemon.
  const teamStrength = data
    ? data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + (p.strength || 0), 0)
    : 0;

  const [displayScore, setDisplayScore] = useState(teamStrength);
  const prevRef = useRef(teamStrength);

  const scoreRef = useRef(null);
  const barRef = useRef(null);   // Loadbar-Container (Segment-Flash)
  const fxRef = useRef(null);    // Partikel-Container
  const toastRef = useRef(null); // aufsteigender "+STÄRKE"-Toast

  // Reward-Pop bei jedem neu aufgedeckten Pokemon.
  useEffect(() => {
    if (caught === 0) return;
    const from = prevRef.current;
    const to = teamStrength;

    // Segment-Flash
    const seg = barRef.current?.querySelector(`.load-seg[data-i="${caught - 1}"]`);
    if (seg) {
      gsap.fromTo(
        seg,
        { "--seg-glow": 1 },
        { "--seg-glow": 0, duration: 0.9, ease: "power2.out" }
      );
    }
    // Balken-Glow-Puls
    if (barRef.current) {
      gsap.fromTo(
        barRef.current,
        { filter: "brightness(1.7)" },
        { filter: "brightness(1)", duration: 0.7, ease: "power2.out" }
      );
    }

    if (to !== from) {
      const delta = to - from;

      // Score zaehlt animiert hoch + kurzer Scale/Glow-Puls
      const proxy = { v: from };
      gsap.to(proxy, {
        v: to,
        duration: 0.7,
        ease: "power2.out",
        onUpdate: () => setDisplayScore(Math.round(proxy.v)),
      });
      if (scoreRef.current) {
        gsap.fromTo(
          scoreRef.current,
          { scale: 1.32, filter: "brightness(1.7)" },
          { scale: 1, filter: "brightness(1)", duration: 0.6, ease: "power2.out" }
        );
      }

      // Aufsteigender "+STÄRKE n"-Toast
      if (toastRef.current) {
        const t = document.createElement("span");
        t.className = "hud-toast-item";
        t.textContent = `+STÄRKE ${delta}`;
        toastRef.current.appendChild(t);
        gsap.fromTo(
          t,
          { y: 0, opacity: 1, scale: 0.8 },
          { y: -52, opacity: 0, scale: 1.15, duration: 1.1, ease: "power2.out", onComplete: () => t.remove() }
        );
      }

      // Partikel-Burst aus der Score-Zahl
      const fx = fxRef.current;
      if (fx) {
        fx.innerHTML = "";
        for (let i = 0; i < 16; i++) {
          const p = document.createElement("span");
          p.className = "fx-spark";
          fx.appendChild(p);
          const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
          const dist = 40 + Math.random() * 56;
          gsap.fromTo(
            p,
            { x: 0, y: 0, opacity: 1, scale: 1 },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 16,
              opacity: 0,
              scale: 0.3,
              duration: 0.7 + Math.random() * 0.3,
              ease: "power2.out",
              onComplete: () => p.remove(),
            }
          );
        }
      }
    }

    prevRef.current = to;
  }, [caught, teamStrength]);

  return (
    <div className={`hud${visible ? " hud-visible" : ""}`}>
      <div className="hud-score" ref={scoreRef}>
        <span className="hud-score-label mono-label">TEAM-STÄRKE</span>
        <span className="hud-score-val">{displayScore}</span>
        <div className="hud-fx" ref={fxRef} />
        <div className="hud-toast" ref={toastRef} />
      </div>

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
      </div>

      <div className="hud-scroll">
        <div className="hud-scroll-fill" ref={scrollFillRef} style={{ width: "0%" }} />
      </div>
    </div>
  );
}
