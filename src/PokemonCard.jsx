import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TYPE_COLORS } from "./pokemonList";

gsap.registerPlugin(ScrollTrigger);

/**
 * 10x Scroll-Transformation:
 * Jede Section ist extra HOCH (CARD_SCROLL = 250vh). Waehrend man durch diese
 * lange Strecke scrollt, ist der Inhalt gepinnt (pin) und die Animation laeuft
 * mit scrub:1 exakt 1:1 mit dem Scroll mit -> die Visuelle Veraenderung
 * (Scale/Rotate/Parallax/Reveal) ist ueber ~10 Viewports gestreckt statt
 * snappy. Das ist die "10fache" Scroll-gesteuerte Transformation.
 */
export default function PokemonCard({ pokemon, index, onReveal }) {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const imgRef = useRef(null);
  const panelRef = useRef(null);
  const numRef = useRef(null);
  const bgRef = useRef(null);
  const revealedRef = useRef(false);

  const primary = TYPE_COLORS[pokemon.types[0]] || "#6d28d9";
  const secondary = TYPE_COLORS[pokemon.types[1]] || primary;
  const dir = index % 2 === 0 ? 1 : -1; // abwechselnd links/rechts

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + window.innerHeight * 4,
        pin: pin,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (!revealedRef.current && self.progress > 0.08) {
            revealedRef.current = true;
            onReveal?.(pokemon.id);
          }
        },
      },
    });

    const REVEAL = 0.62;
    const HOLD = 1 - REVEAL;

    tl.fromTo(imgRef.current,
      { scale: 0.55, rotate: -25 * dir, yPercent: 30, filter: "blur(8px)" },
      { scale: 1.25, rotate: 8 * dir, yPercent: -12, filter: "blur(0px)", ease: "none", duration: REVEAL }, 0);
    tl.fromTo(panelRef.current,
      { xPercent: 120 * dir, opacity: 0, rotateY: 35 * dir },
      { xPercent: 0, opacity: 1, rotateY: 0, ease: "none", duration: REVEAL }, 0);
    tl.fromTo(numRef.current,
      { xPercent: -40 * dir, opacity: 0.15, scale: 1.4 },
      { xPercent: 40 * dir, opacity: 0.35, scale: 1.0, ease: "none", duration: REVEAL }, 0);
    tl.fromTo(bgRef.current,
      { scale: 0.5, opacity: 0.5, background: `radial-gradient(circle, ${primary}77, transparent 72%)` },
      { scale: 2.0, opacity: 1, background: `radial-gradient(circle, ${secondary}88, transparent 72%)`, ease: "none", duration: REVEAL }, 0);
    tl.to({}, { duration: HOLD }, REVEAL);

    const img = imgRef.current;
    const onLoad = () => ScrollTrigger.refresh();
    if (img && !img.complete) img.addEventListener("load", onLoad, { once: true });
    else requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      if (img) img.removeEventListener("load", onLoad);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [pokemon, index, dir, primary, secondary, onReveal]);

  const total = pokemon.stats.reduce((s, x) => s + x.value, 0);

  return (
    <section ref={sectionRef} className="card-section">
      <div ref={pinRef} className="card-pin">
        <div ref={bgRef} className="card-bg" />
        <div ref={numRef} className="card-num">
          {String(pokemon.id).padStart(3, "0")}
        </div>

        <div className="card-content">
          <div
            className="card-art"
            style={{ filter: `drop-shadow(0 0 28px ${primary}aa)` }}
          >
            <img ref={imgRef} src={pokemon.artwork} alt={pokemon.name_de} loading="lazy" />
            <div className="card-types">
              {pokemon.types.map((t) => (
                <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div ref={panelRef} className="card-panel neon-border sheen" style={{ "--tc": primary }}>
            <span className="holo-glass" aria-hidden="true"></span>
            <h2>{pokemon.name_de}</h2>
            <p className="card-sub">
              #{String(pokemon.id).padStart(3, "0")} · {pokemon.height / 10} m ·{" "}
              {pokemon.weight / 10} kg
            </p>
            <div className="stat-grid">
              {pokemon.stats.map((s) => (
                <div className="stat-row" key={s.name}>
                  <span className="stat-name">{s.name}</span>
                  <div className="stat-bar">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, s.value)}%`, background: primary }}
                    />
                  </div>
                  <span className="stat-val">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="stat-total" style={{ color: primary }}>
              BST {total} · <span className="strength-badge">STÄRKE {pokemon.strength}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
