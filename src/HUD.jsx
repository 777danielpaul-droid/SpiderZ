import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import "./hud.css";

/**
 * Horizontales Cyberpunk-HUD für SpiderZ (unten, mittig).
 *
 * Layout (horizontal nebeneinander, je Modul = Spalte Label/Readout):
 *   SYSTEM · TEAM-STÄRKE (+LV) · GEFANGEN · SCAN · AKTIVES TEAM
 *
 * Effekte: Sci-Fi-Glow, Pulse bei Wertänderung, Scanline, Cyberpunk-Brackets.
 * Reward-Pop (Score-Count-up, Partikel, +STÄRKE-Toast) + Gating bleiben erhalten.
 */
export default function HUD({ total, caughtIds, data, scrollFillRef, pulseRef, visible, collapsed, onToggle, onRestart, onShowRecords, onNext, canNext, nextLabel, onSearch, searchQuery, setSearchQuery, steroids, onUseSteroid }) {
  const caught = caughtIds.length;

  // Challenge-Score: Gesamtstaerke aller gefangenen mon.
  const teamStrength = data
    ? data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + (p.strength || 0), 0)
    : 0;
  const level = Math.floor(teamStrength / 300) + 1;

  const caughtMon = data ? data.filter((p) => caughtIds.includes(p.id)) : [];
  // Letzte 4 gefangene (neueste zuerst) fuer das Team-Readout.
  const teamPreview = [...caughtMon].slice(-4).reverse();

  const [displayScore, setDisplayScore] = useState(teamStrength);
  const prevRef = useRef(teamStrength);

  const scoreRef = useRef(null);
  const barRef = useRef(null);   // Gefangen-Bar (Flash bei Reveal)
  const fxRef = useRef(null);    // Partikel-Container
  const toastRef = useRef(null); // aufsteigender "+STÄRKE"-Toast

  // Reward-Pop bei jedem neu aufgedeckten mon.
  useEffect(() => {
    if (caught === 0) return;
    const from = prevRef.current;
    const to = teamStrength;

    // Gefangen-Bar Glow-Puls
    if (barRef.current) {
      gsap.fromTo(
        barRef.current,
        { filter: "brightness(1.9)" },
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
          { scale: 1.18, filter: "brightness(1.8)" },
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

  const caughtPct = total ? (caught / total) * 100 : 0;

  return (
    <div className={`hud${visible ? " hud-visible" : ""}${collapsed ? " hud-collapsed" : ""}`}>
      <div className="hud-frame">
        {/* SYSTEM-Status */}
        <section className="hud-mod">
          <div className="hud-mod-label mono-label">SYSTEM</div>
          <div className="hud-status">
            <span className="hud-dot hud-dot-live" /> ONLINE
            <span className="hud-sep">·</span>
            <span className="hud-dot hud-dot-sync" /> LINK
          </div>
          <div className="hud-actions">
            <button type="button" className="hud-btn" onClick={onRestart} title="Neue Runde">↻ NEUSTART</button>
            <button type="button" className="hud-btn" onClick={onShowRecords} title="Rekorde & Dex">★ REKORDE</button>
            {canNext && (
              <button type="button" className="hud-btn hud-btn-next" onClick={onNext} title="Zum nächsten Monster">
                {nextLabel}
              </button>
            )}
          </div>
        </section>

        <div className="hud-divider" />

        {/* TEAM-STÄRKE + LEVEL */}
        <section className="hud-mod hud-mod-score">
          <div className="hud-mod-label mono-label">TEAM-STÄRKE</div>
          <div className="hud-score-readout" ref={scoreRef}>
            <span className="hud-score-val">{displayScore}</span>
            <div className="hud-fx" ref={fxRef} />
          </div>
          <div className="hud-level-row">
            <span className="hud-lv-tag">LV</span>
            <span className="hud-lv-val">{level}</span>
          </div>
          <div className="hud-toast" ref={toastRef} />
        </section>

        <div className="hud-divider" />

        {/* GEFANGEN */}
        <section className="hud-mod">
          <div className="hud-mod-label mono-label">GEFANGEN</div>
          <div className="hud-readout-row" ref={barRef}>
            <span className="hud-count-val">{caught}</span>
            <span className="hud-count-sep">/</span>
            <span className="hud-count-max">{total}</span>
          </div>
          <div className="hud-bar">
            <div className="hud-bar-fill" style={{ width: `${caughtPct}%` }} />
          </div>
        </section>

        <div className="hud-divider" />

        {/* STEROIDE (Inventar) */}
        <section className="hud-mod">
          <div className="hud-mod-label mono-label">STEROIDE</div>
          <div className="hud-readout-row">
            <span className="hud-count-val">{steroids || 0}</span>
            <span className="hud-count-sep">×</span>
            <span className="hud-count-max">+100</span>
          </div>
          {steroids > 0 && onUseSteroid && (
            <button
              type="button"
              className="hud-btn hud-btn-steroid"
              onClick={onUseSteroid}
              title="Steroid für +100 Stärke im nächsten Kampf einsetzen"
            >
              💉 EINSETZEN
            </button>
          )}
        </section>

        <div className="hud-divider" />
        <section className="hud-mod">
          <div className="hud-mod-label mono-label">SCAN</div>
          <div className="hud-bar">
            <div className="hud-bar-fill hud-scan-fill" ref={scrollFillRef} style={{ width: "0%" }} />
          </div>
        </section>

        <div className="hud-divider" />

        {/* AKTIVES TEAM (letzte 4) */}
        <section className="hud-mod">
          <div className="hud-mod-label mono-label">AKTIVES TEAM</div>
          {teamPreview.length === 0 ? (
            <div className="hud-team-empty">— keine Daten —</div>
          ) : (
            <ul className="hud-team-list">
              {teamPreview.map((p) => (
                <li className="hud-team-item" key={p.id}>
                  <span className="hud-team-name">{p.name_de}</span>
                  <span className="hud-team-str">{p.strength}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="hud-divider" />

        {/* SUCHE (NasaMon-DB) */}
        <section className="hud-mod hud-mod-search">
          <div className="hud-mod-label mono-label">SUCHE</div>
          <form
            className="hud-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              const q = (searchQuery || "").trim();
              if (q && onSearch) onSearch(q);
            }}
          >
            <input
              className="hud-input"
              type="text"
              inputMode="text"
              placeholder="Nr (1–18) / Name"
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              aria-label="Spider-Monster suchen"
            />
            <button className="hud-btn hud-search-btn" type="submit" title="Suchen">
              SUCHEN
            </button>
          </form>
        </section>
      </div>

      {/* Integrierte Bottom-Leiste: einziger Toggle-Trigger (Mobile) */}
      <div
        className="hud-strip"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        aria-label={collapsed ? "HUD ausfahren" : "HUD einklappen"}
        aria-expanded={!collapsed}
      >
        <span className="hud-strip-label">HUD</span>
        <span className="hud-strip-chevron">{collapsed ? "▲" : "▼"}</span>
      </div>
    </div>
  );
}
