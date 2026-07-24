import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { usePokemonData } from "./usePokemonData";
import { TOTAL_POKEMON, TYPE_COLORS } from "./pokemonList";
import PokemonCard from "./PokemonCard";
import ScrubSection from "./ScrubSection";
import CutenessSection from "./CutenessSection";
import SearchResult from "./SearchResult";
import HUD from "./HUD";
import { loadDex, loadBestTeamStrength, saveCaught, saveBestTeamStrength } from "./storage";
import RecordsOverlay from "./RecordsOverlay";
import DexOverlay from "./DexOverlay";
import "./App.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Refresh: Browser-Restoration deaktivieren (muss vor nativem Restore laufen
// -> Modul-Ebene, nicht erst im Effect).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

export default function App() {
  const { data, error, progress, search, runSearch, clearSearch, reset } = usePokemonData(TOTAL_POKEMON);
  const [caughtIds, setCaughtIds] = useState([]);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const [hudVisible, setHudVisible] = useState(false);
  const [activeCard, setActiveCard] = useState(0); // Index des aktiven Pokemon
  const [dark, setDark] = useState(true);
  const [hudView, setHudView] = useState("play");   // 'play' | 'records' | 'dex'

  // Theme auf <html data-theme> spiegeln (CSS reagiert via [data-theme="dark"])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // Runde beendet (alle gefangen) -> in Pokedex + Rekord speichern.
  useEffect(() => {
    if (!data || caughtIds.length < TOTAL_POKEMON) return;
    const caught = data.filter((p) => caughtIds.includes(p.id));
    if (caught.length === 0) return;
    const teamStrength = caught.reduce((s, p) => s + (p.strength || 0), 0);
    saveCaught(caught.map((p) => ({
      id: p.id, name_de: p.name_de, types: p.types, artwork: p.artwork, strength: p.strength,
    })));
    saveBestTeamStrength(teamStrength);
  }, [data, caughtIds]);

  // Neustart: frische Runde + UI zuruecksetzen.
  const handleRestart = useCallback(() => {
    setCaughtIds([]);
    setActiveCard(0);
    setHudView("play");
    revealPlayed.current = false;
    reset();
    window.scrollTo(0, 0);
  }, [reset]);

  const scrollFillRef = useRef(null);
  const stRef = useRef(null);
  const cardTrgRef = useRef([]); // ScrollTrigger je Karte (fuer "Weiter"-Button)
  const endcardRef = useRef(null);   // Final-Event: Team-Reveal
  const teamRefs = useRef({});       // DOM-Refs der Team-Karten
  const revealPlayed = useRef(false); // Finale nur einmal abspielen
  const logoRef = useRef(null);      // SpiderZ-Wortmarke (Fade-in beim 1. Scroll)

  // "Weiter"-Button: smooth zum naechsten Pokemon (oder ans Team-Ende).
  // Erst nach dem ersten gefangenen Pokemon nutzbar (vorher muss gescrollt werden).
  const goNext = useCallback(() => {
    if (caughtIds.length === 0) return;
    // Bei der letzten Karte: direkt zur Team-Endcard (kein ueberfluessiger
    // Zwischenschritt — ein Druck reicht vom Final-Reveal zum Team).
    if (activeCard >= TOTAL_POKEMON - 1) {
      // Zum absoluten Dokumentende scrollen -> Endcard komplett unten (kein
      // 111px-Luftloch ueber der Endcard-Oberkante).
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      gsap.to(window, { scrollTo: maxY, duration: 0.9, ease: "power2.inOut" });
      setActiveCard(TOTAL_POKEMON);
      return;
    }
    const next = activeCard + 1;
    const trg = cardTrgRef.current[next];
    if (trg) {
      // ans Ende des naechsten Pokemons springen -> voll aufgedeckt
      const y = trg.end - window.innerHeight * 0.3;
      gsap.to(window, { scrollTo: y, duration: 0.8, ease: "power2.inOut" });
    }
    setActiveCard(next);
  }, [activeCard, caughtIds.length]);

  // Refresh: Browser-Restoration deaktivieren (Modul-Ebene, vor nativem Restore).
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // HUD sichtbar erst nach der Video-Animation (Held-Scrub durchgescrollt).
  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => {
      const st = ScrollTrigger.create({
        trigger: heroRef.current,
        start: "bottom 90%",
        onEnter: () => setHudVisible(true),
        onLeaveBack: () => setHudVisible(false),
      });
      stRef.current = st;
    });
    return () => {
      cancelAnimationFrame(id);
      stRef.current?.kill();
    };
  }, [data]);
  // WICHTIG: kein setScrollProgress pro Frame -> sonst 60x Re-Render/Sekunde,
  // neue onReveal-Ref, Karten-Effect rebuild -> ScrollTrigger-Reset ("springt zur 1").
  // Stattdessen Progress-Bar direkt per DOM-Ref updaten (kein React-Re-Render).
  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const pct = Math.round(self.progress * 100);
        if (scrollFillRef.current) {
          scrollFillRef.current.style.width = pct + "%";
        }
      },
    });
    return () => st.kill();
  }, [data]);

  // Sobald die Karten gemountet sind, ScrollTrigger neu vermessen,
  // damit Pin-Distanzen (viewport-abhaengig) stimmen. Danach alle Card-Trigger
  // fuer den "Weiter"-Button einsammeln.
  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      cardTrgRef.current = ScrollTrigger.getAll()
        .filter((st) => st.trigger && st.trigger.classList.contains("card-section"))
        .sort((a, b) => a.start - b.start);
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  // FINAL-EVENT: Team-Reveal. Laeuft erst, wenn die Team-Sektion wirklich
  // in den View scrollt (nicht schon beim Fangen unten im Off).
  function playTeamReveal() {
    if (revealPlayed.current) return;
    revealPlayed.current = true;

    const cards = [...document.querySelectorAll(".team-card")];
    const grid = document.querySelector(".team-grid");
    const flash = document.querySelector(".reveal-flash");
    const sweep = document.querySelector(".scanline-sweep");
    if (!cards.length) return;

    // Start: Karten aus einem Punkt unten, unsichtbar, leicht gedreht, blur+hell
    gsap.set(cards, {
      opacity: 0, scale: 0.15, y: 300,
      rotateZ: () => gsap.utils.random(-45, 45),
      transformOrigin: "50% 50%",
      filter: "blur(10px) brightness(2.4)",
    });
    cards.forEach((c) => c.classList.add("reveal-glow"));

    const tl = gsap.timeline();

    // 1) Licht-Blast (Fullscreen-Flash)
    if (flash) {
      tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "power2.in" })
        .to(flash, { opacity: 0, duration: 0.55, ease: "power2.out" });
    }

    // 2) Screen-Shake auf dem Grid
    if (grid) {
      tl.to(grid, {
        keyframes: {
          "0%": { x: 0, y: 0 }, "12%": { x: -16, y: 9 }, "24%": { x: 14, y: -11 },
          "38%": { x: -11, y: 7 }, "52%": { x: 9, y: -6 }, "68%": { x: -6, y: 4 },
          "84%": { x: 4, y: -2 }, "100%": { x: 0, y: 0 },
        },
        duration: 0.65, ease: "none",
      }, 0.08);
    }

    // 3) Karten detonierten aus einem Punkt + Neon-Trail-Glow
    tl.to(cards, {
      opacity: 1, scale: 1, y: 0, rotateZ: 0,
      filter: "blur(0px) brightness(1)",
      duration: 0.95, ease: "back.out(2.2)", stagger: 0.14,
    }, 0.18);

    // 4) Pro Karte: Sprite-Zoom, Chromatic-Abberation, Glitch, Typed-Name, Stärke hoch
    cards.forEach((card, i) => {
      const img = card.querySelector("img");
      const nameEl = card.querySelector(".team-name");
      const strEl = card.querySelector(".team-strength");
      const caught = card.classList.contains("is-caught");
      const at = 0.45 + i * 0.14;

      if (img) {
        tl.fromTo(img, { scale: 1.8 }, { scale: 1, duration: 0.7, ease: "power3.out" }, at)
          .fromTo(img,
            { filter: "drop-shadow(8px 0 0 rgba(255,0,80,0.95)) drop-shadow(-8px 0 0 rgba(0,200,255,0.95)) brightness(2.4)" },
            { filter: "drop-shadow(0 0 0 rgba(0,0,0,0)) brightness(1)", duration: 0.55, ease: "power2.out" }, at);
      }
      if (caught && nameEl) {
        const target = data.find((p) => String(p.id) === card.dataset.id);
        const fullName = target ? target.name_de : nameEl.textContent;
        tl.call(() => {
          nameEl.textContent = "";
          nameEl.dataset.glitch = fullName;
          nameEl.classList.add("glitch", "typing");
          let n = 0;
          const t = setInterval(() => {
            n++;
            nameEl.textContent = fullName.slice(0, n);
            if (n >= fullName.length) { clearInterval(t); nameEl.classList.remove("glitch", "typing"); }
          }, 40);
        }, null, at + 0.15);
        if (strEl) {
          const strVal = target ? target.strength : 0;
          const proxy = { v: 0 };
          tl.to(proxy, {
            v: strVal, duration: 0.7, ease: "power2.out",
            onUpdate: () => { strEl.textContent = `STÄRKE ${Math.round(proxy.v)}`; },
          }, at + 0.2);
        }
      }
    });

    // 5) Scanline-Sweep ueber die Sektion
    if (sweep) {
      tl.fromTo(sweep, { yPercent: -120 }, { yPercent: 120, duration: 0.75, ease: "power1.inOut" }, 0.28);
    }

    // Glow-Klasse nach Abklingen entfernen
    tl.call(() => cards.forEach((c) => c.classList.remove("reveal-glow")), null, 1.5);
  }

  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => {
      teamRefs.current = {};
      document.querySelectorAll(".team-card").forEach((el) => {
        teamRefs.current[el.dataset.id] = el;
      });
      ScrollTrigger.create({
        trigger: endcardRef.current,
        start: "top 65%",
        once: true,
        onEnter: () => playTeamReveal(),
      });
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  // SpiderZ-Wortmarke: startet versteckt, Fade-in (wie Team-Cards)
  // wird durch die ERSTE Scroll-Interaktion ausgelöst.
  useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const ball = el.querySelector(".ball");
    const word = el.querySelector(".word");

    // Start: winzig, unscharf, hell — wie die Team-Cards beim Reveal
    gsap.set(el, { opacity: 0, scale: 0.4, y: 40, filter: "blur(10px) brightness(2.2)" });
    gsap.set(ball, { scale: 0.3, opacity: 0 });
    gsap.set(word, { opacity: 0, y: 18 });

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      const tl = gsap.timeline();
      tl.to(el, {
        opacity: 1, scale: 1, y: 0,
        filter: "blur(0px) brightness(1)",
        duration: 0.85, ease: "back.out(1.8)",
      })
        .to(ball, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2.2)" }, "<0.05")
        .to(word, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "<0.1");
      // Sichtbarkeit (CSS: visibility:hidden) beim Reveal aufheben
      el.style.visibility = "visible";
      window.removeEventListener("wheel", play);
      window.removeEventListener("touchstart", play);
      window.removeEventListener("keydown", play);
    };

    // Erstes Scrollen (Mausrad, Touch, Pfeiltasten) triggert den Auftritt.
    // KEIN 'scroll'-Event: das wuerde durch native Restore/Resize feuern
    // und das Reveal beim Reload automatisch ausloesen.
    window.addEventListener("wheel", play, { passive: true });
    window.addEventListener("touchstart", play, { passive: true });
    window.addEventListener("keydown", play);
    return () => {
      window.removeEventListener("wheel", play);
      window.removeEventListener("touchstart", play);
      window.removeEventListener("keydown", play);
    };
  }, []);

  // Escape schließt das Such-Modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && (search.result || search.loading || search.error)) {
        clearSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search.result, search.loading, search.error, clearSearch]);

  const handleReveal = useCallback((id) => {
    setCaughtIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return (
    <div className="app" ref={rootRef}>
      <div className="reveal-flash" aria-hidden="true" />
      <HUD
        total={TOTAL_POKEMON}
        caughtIds={caughtIds}
        data={data}
        scrollFillRef={scrollFillRef}
        visible={hudVisible}
        onRestart={handleRestart}
        onShowRecords={() => setHudView("records")}
        onNext={goNext}
        canNext={caughtIds.length > 0}
        nextLabel={activeCard >= TOTAL_POKEMON - 1 ? "Zum Team ▾" : "Weiter ▸"}
      />

      {hudView === "records" && (
        <RecordsOverlay
          onClose={() => setHudView("play")}
          onOpenDex={() => setHudView("dex")}
        />
      )}
      {hudView === "dex" && (
        <DexOverlay onClose={() => setHudView("records")} />
      )}

      <header className="hero" ref={heroRef}>
        <ScrubSection hintHidden={caughtIds.length > 0}>
          <div className="poke-logo" ref={logoRef} aria-label="SpiderZ">
            <span className="ball" aria-hidden="true" />
            <span className="word">SpiderZ</span>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Hellen Modus" : "Dunklen Modus"}
            title={dark ? "Hellen Modus" : "Dunklen Modus"}
          >
            <span className="theme-toggle-icon">{dark ? "☀" : "☾"}</span>
          </button>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) runSearch(query);
            }}
          >
            <input
              className="search-input"
              type="text"
              inputMode="text"
              placeholder="Nummer (1–1025) oder Name (z.B. pikachu)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Pokémon suchen"
            />
            <button className="search-btn" type="submit">
              Suchen
            </button>
          </form>
        </ScrubSection>
      </header>

      {search.result || search.loading || search.error ? (
        <SearchResult
          result={search.result}
          error={search.error}
          loading={search.loading}
          onClose={clearSearch}
        />
      ) : null}

      {error && (
        <div className="loader error">Fehler beim Laden: {error}</div>
      )}

      {!data && !error && (
        <div className="loader">
          <div className="loader-bar">
            <div className="loader-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>Lade Pokémon-Daten … {progress}%</p>
        </div>
      )}

      {data && (
        <main className="cards">
          {data.map((p, i) => (
            <PokemonCard
              key={p.name_en}
              pokemon={p}
              index={i}
              onReveal={handleReveal}
            />
          ))}

          <footer className="endcard" ref={endcardRef}>
            <div className="scanline-sweep" aria-hidden="true" />
            <h2 className="end-title">
              {caughtIds.length >= TOTAL_POKEMON ? "Dein TEAM!" : "Dein Team"}
            </h2>

            <div className="team-grid">
              {data.map((p) => {
                const caught = caughtIds.includes(p.id);
                const primary = p.types && p.types[0];
                return (
                  <div
                    key={p.name_en}
                    data-id={p.id}
                    ref={(el) => { if (el) teamRefs.current[p.id] = el; }}
                    className={`team-card${caught ? " is-caught" : ""}`}
                    style={{
                      "--tc": primary ? TYPE_COLORS[primary] : "var(--lila)",
                    }}
                  >
                    <img
                      src={p.artwork}
                      alt={p.name_de}
                      loading="lazy"
                      style={caught ? { filter: `drop-shadow(0 0 22px ${primary ? TYPE_COLORS[primary] : "#6d28d9"}aa)` } : { filter: "grayscale(1) opacity(0.35)" }}
                    />
                  </div>
                );
              })}
            </div>
          </footer>

          {/* Cuteness-Overload: nur wenn Team komplett + Stärke < 1100 */}
          {data && caughtIds.length >= TOTAL_POKEMON && (() => {
            const ts = data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + (p.strength || 0), 0);
            return ts < 1100 ? <CutenessSection /> : null;
          })()}
        </main>
      )}
    </div>
  );
}
