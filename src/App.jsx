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
import { resolveMatch, hasAdvantage, BONUS } from "./typeBattle";
import "./App.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Refresh: Browser-Restoration deaktivieren (muss vor nativem Restore laufen
// -> Modul-Ebene, nicht erst im Effect).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

export default function App() {
  const { data, error, search, runSearch, clearSearch, reset, allData } = usePokemonData(TOTAL_POKEMON);
  const [caughtIds, setCaughtIds] = useState([]);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const [hudVisible, setHudVisible] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(true); // Mobile: HUD startet eingefahren (nur Kante), per Tap ausfahren
  const toggleHud = useCallback(() => setHudCollapsed((c) => !c), []);
  const [headerCollapsed, setHeaderCollapsed] = useState(false); // Mobile: Header nach Intro auto-einfahren
  const toggleHeader = useCallback(() => setHeaderCollapsed((c) => !c), []);
  const handleScrubReady = useCallback(() => {
    // Nur mobil: nach der Frame2Frame-Animation automatisch einfahren.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      const t = setTimeout(() => setHeaderCollapsed(true), 2600);
      return () => clearTimeout(t);
    }
  }, []);
  const [activeCard, setActiveCard] = useState(0); // Index des aktiven Pokemon
  const [dark, setDark] = useState(true);
  const [hudView, setHudView] = useState("play");   // 'play' | 'records' | 'dex'

  // Theme auf <html data-theme> spiegeln (CSS reagiert via [data-theme="dark"])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // Header faehrt beim Laden von links rein (technischer Reveal).
  useEffect(() => {
    if (!headerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        xPercent: -100, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.15,
      });
    });
    return () => ctx.revert();
  }, []);

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

  // ---- VIAL / STEROIDE: einmalig nutzbar, blockiert Arena bis vergeben ----
  const [vialTaken, setVialTaken] = useState(false);   // Vial aufgenommen (armed)
  const [boostedId, setBoostedId] = useState(null);    // Spinne mit +100 (null = noch nicht vergeben)
  const [revealed, setRevealed] = useState(false);     // Team-Reveal abgeschlossen -> Vial darf erscheinen
  const [loreOpen, setLoreOpen] = useState(false);     // Lore-Modal (Chronik)
  const [boosterOpen, setBoosterOpen] = useState(false); // Booster-Screen nach Arena-Sieg
  const [boosterCta, setBoosterCta] = useState(false);   // "Booster öffnen"-Button nach Durchscrollen

  // ---- ARENA: 3 gefangene vs 3 RNG-Gegner (aus allen 18, exkl. eigene) ----
  // Gegner werden ERST berechnet, wenn das Vial vergeben wurde (boostedId != null).
  const [arenaOpponents, setArenaOpponents] = useState(null); // Array(3) oder null
  useEffect(() => {
    if (!allData || caughtIds.length < TOTAL_POKEMON || boostedId == null) { setArenaOpponents(null); return; }
    const own = new Set(caughtIds);
    const pool = allData.filter((m) => !own.has(m.id));
    const shuffled = pool
      .map((m) => ({ m, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, TOTAL_POKEMON)
      .map((x) => x.m);
    setArenaOpponents(shuffled);
  }, [allData, caughtIds, boostedId]);

  // Arena-Matches (1:1 in Reihenfolge) + Gesamt-Ergebnis.
  // Geboostete Spinne bekommt +100 Stärke vor dem Match.
  const caughtTeam = data ? data.filter((p) => caughtIds.includes(p.id)) : [];
  const boostedTeam = caughtTeam.map((p) =>
    p.id === boostedId ? { ...p, strength: (p.strength || 0) + 100 } : p
  );
  const arenaMatches = [];
  if (arenaOpponents && boostedTeam.length >= TOTAL_POKEMON) {
    for (let i = 0; i < TOTAL_POKEMON; i++) {
      const a = boostedTeam[i];
      const b = arenaOpponents[i];
      if (a && b) arenaMatches.push({ a, b, result: resolveMatch(a, b) });
    }
  }
  const arenaWins = arenaMatches.filter((m) => m.result.winner === "a").length;
  const arenaLosses = arenaMatches.filter((m) => m.result.winner === "b").length;
  const arenaDraws = arenaMatches.filter((m) => m.result.winner === "draw").length;

  // Booster-Screen erst, wenn die Arena-Ergebnisse durchgescrollt wurden (nicht direkt bei Sieg).
  // arena-result ist das letzte Element -> start muss erreichbar sein (nicht "top 70%",
  // sonst wird die Zeile am Scroll-Ende nie so weit hochgeschoben).
  const boostShown = useRef(false);
  useEffect(() => {
    if (arenaWins < 2 || arenaMatches.length !== TOTAL_POKEMON) return;
    if (!arenaEndRef.current || boostShown.current) return;
    const id = requestAnimationFrame(() => {
      // Layout (async Spider-Bilder) erst finalisieren, dann Trigger vermessen.
      ScrollTrigger.refresh();
      const el = arenaEndRef.current;
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top 90%", // erreichbar: feuert, sobald die Ergebnis-Zeile im unteren Viewport erscheint
        once: true,
        onEnter: () => { boostShown.current = true; setBoosterCta(true); },
      });
      // Fallback: falls bei Mount schon sichtbar (sehr hoher Viewport) -> sofort öffnen.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        boostShown.current = true; setBoosterOpen(true); trigger.kill();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [arenaWins, arenaMatches.length]);

  // Neustart: frische Runde + UI zuruecksetzen.
  const handleRestart = useCallback(() => {
    setCaughtIds([]);
    setActiveCard(0);
    setHudView("play");
    setVialTaken(false);
    setBoostedId(null);
    setRevealed(false);
    setBoosterOpen(false);
    setBoosterCta(false);
    boostShown.current = false;
    revealPlayed.current = false;
    reset();
    window.scrollTo(0, 0);
  }, [reset]);

  const scrollFillRef = useRef(null);
  const stRef = useRef(null);
  const cardTrgRef = useRef([]); // ScrollTrigger je Karte (fuer "Weiter"-Button)
  const endcardRef = useRef(null);   // Final-Event: Team-Reveal
  const arenaEndRef = useRef(null);  // Arena-Ergebnis -> Booster-Screen nach Durchscrollen
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
      // Zum absoluten Dokumentende scrollen -> Endcard komplett unten.
      // onComplete prueft erneut: falls Seite durch nachladende Bilder noch
      // gewachsen ist, wird der Rest kurz nachgescrollt (kein Luftloch).
      const toBottom = () => {
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        gsap.to(window, {
          scrollTo: maxY, duration: 0.9, ease: "power2.inOut",
          onComplete: () => {
            const newMax = document.documentElement.scrollHeight - window.innerHeight;
            if (newMax > maxY + 2) gsap.to(window, { scrollTo: newMax, duration: 0.3, ease: "power1.out" });
          }
        });
      };
      toBottom();
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

    // Verzoegerung am Punkt des Team-Reveals: nach dem Effekt kurz Pause,
    // DANN erst darf das Vial erscheinen.
    tl.call(() => setRevealed(true), null, 1.5 + 0.8);
  }

  useEffect(() => {
    if (!data) return;
    let trigger;
    const id = requestAnimationFrame(() => {
      teamRefs.current = {};
      document.querySelectorAll(".team-card").forEach((el) => {
        teamRefs.current[el.dataset.id] = el;
      });
      trigger = ScrollTrigger.create({
        trigger: endcardRef.current,
        start: "top 65%",
        once: true,
        onEnter: () => playTeamReveal(),
      });
    });
    return () => {
      cancelAnimationFrame(id);
      if (trigger) trigger.kill();
    };
  }, [data]);

  // Escape schließt Such-Modal und Lore-Modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (loreOpen) { setLoreOpen(false); return; }
      if (search.result || search.loading || search.error) clearSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search.result, search.loading, search.error, clearSearch, loreOpen]);

  const handleReveal = useCallback((id) => {
    setCaughtIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // Sanfter Anker-Scroll ueber GSAP (konsistent mit ScrollTrigger-Architektur).
  const scrollToId = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 60; // Header-Hoehe abziehen
    gsap.to(window, { scrollTo: y, duration: 0.8, ease: "power2.inOut" });
  }, []);

  return (
    <div className="app" ref={rootRef}>
      <header className={`site-header${headerCollapsed ? " header-collapsed" : ""}`} ref={headerRef}>
      <span className="holo-glass" aria-hidden="true"></span>
        <a className="site-logo" href="#spiderz" onClick={(e) => { e.preventDefault(); scrollToId("spiderz"); }} aria-label="SpiderZ">SPIDER<span>Z</span></a>
        <nav className="site-nav">
          <a className="site-link" href="#spiderz" onClick={(e) => { e.preventDefault(); scrollToId("spiderz"); }}>SpiderZ</a>
          <a className="site-link" href="#story" onClick={(e) => { e.preventDefault(); scrollToId("story"); }}>Spielregeln</a>
          <button type="button" className="site-link lore-link" onClick={() => setLoreOpen(true)}>Lore</button>
          <a className="site-link" href={import.meta.env.BASE_URL + "datenschutz.html"} target="_blank" rel="noopener">Datenschutz</a>
          <a className="site-link" href={import.meta.env.BASE_URL + "impressum.html"} target="_blank" rel="noopener">Impressum</a>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setDark((d) => !d)}
          aria-label={dark ? "Hellen Modus" : "Dunklen Modus"}
          title={dark ? "Hellen Modus" : "Dunklen Modus"}
        >
          <span className="theme-toggle-icon">{dark ? "☀" : "☾"}</span>
        </button>
        {/* Integrierte Top-Leiste: einziger Header-Toggle (Mobile, HUD-Look) */}
        <div
          className="header-strip"
          role="button"
          tabIndex={0}
          onClick={toggleHeader}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleHeader(); } }}
          aria-label="Header ein-/ausfahren"
        >
          <span className="header-strip-label">MENÜ</span>
          <span className="header-strip-chevron">{headerCollapsed ? "▾" : "▴"}</span>
        </div>
      </header>
      <div className="reveal-flash" aria-hidden="true" />
      <HUD
        total={TOTAL_POKEMON}
        caughtIds={caughtIds}
        data={data}
        scrollFillRef={scrollFillRef}
        visible={hudVisible}
        collapsed={hudCollapsed}
        onToggle={toggleHud}
        onRestart={handleRestart}
        onShowRecords={() => setHudView("records")}
        onNext={goNext}
        canNext={caughtIds.length > 0}
        nextLabel={activeCard >= TOTAL_POKEMON - 1 ? "Zum Team ▾" : "Weiter ▸"}
        onSearch={runSearch}
        searchQuery={query}
        setSearchQuery={setQuery}
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

      <header className={`hero`} ref={heroRef} id="spiderz">
        <ScrubSection hintHidden={caughtIds.length > 0} onReady={handleScrubReady}>
        </ScrubSection>
      </header>

      {/* STORY-Sektion (Anker-Ziel #story) — technisches Milchglas-Panel */}
      <section className="story" id="story">
        <div className="story-grid">
          <div className="story-tag">// DOSSIER_001</div>
          <h2 className="story-title">DIE SPINNEN-SCHWARME</h2>
          <p className="story-body">
            Tief in den Neonschächten von New-Arachne erwachten die <strong>SpiderZ</strong> —
            mutierte Arachniden, deren Typen in drei Fraktionen kollidieren:
            <span className="story-hl gift">GIFT</span>,
            <span className="story-hl staerke">STÄRKE</span>,
            <span className="story-hl verteidigung">VERTEIDIGUNG</span>.
            Scanne sie, fange dein Team aus drei, verpasse einem das Steroid-Vial —
            und schick es in die Arena gegen den RNG-Schwarm.
          </p>
          <ul className="story-stats">
            <li><span>18</span> Spezies</li>
            <li><span>3</span> Fraktionen</li>
            <li><span>+100</span> Vial-Boost</li>
            <li><span>1:1</span> Arena-Kampf</li>
          </ul>
        </div>
      </section>

      {search.result || search.loading || search.error ? (
        <SearchResult
          result={search.result}
          error={search.error}
          loading={search.loading}
          onClose={clearSearch}
        />
      ) : null}

      {/* LORE / CHRONIK: Modal im Seiten-Stil (dunkles Glas + Gold + Serif) */}
      {loreOpen && (
        <div
          className="lore-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Die Chronik von Paaway Kaka"
          onClick={(e) => { if (e.target === e.currentTarget) setLoreOpen(false); }}
        >
          <span className="holo-glass" aria-hidden="true"></span>
          <article className="lore-scroll">
            <div className="lore-ornament">❧ CHRONIK ❧</div>
            <div className="lore-rule" />
            <h1 className="lore-title">Die Chronik von Paaway Kaka</h1>
            <div className="lore-sub">— der eiserne Kodex auf dem Bambus —</div>

            <p>Auf den ländlichen Pfaden der Philippinen erhebt sich seit Generationen ein ungeschriebenes Gesetz: das der Arena auf dem Bambusstab. Dies ist keine Sage aus alten Mythen, sondern ein überliefertes Ritual der Jugend – eine reale Tradition, in der die Natur selbst zur Bühne wird. Manche Kids nennen sie scherzhaft ihre TaschenMonster.</p>

            <p>Aus den Wipfeln der Bäume und von den Drähten des Dorfes werden die Kriegerinnen erwählt: agile Radnetzspinnen der Gattung Neoscona. In hölzernen Kammern und Streichholzschachteln geborgen, erhalten sie Nahrung und Stärkungen, von Nektar bis hin zu süßen Essenzen, auf dass ihr Panzer härte und ihr Gift die Klinge schärfe.</p>

            <p>Wenn die Stunde schlägt, treffen die Champions aufeinander. Auf schmalem Grat, Auge in Auge, entbrennt der kurze, erbarmungslose Eid des Stahls. Kein Raum für Zögern, nur der Sieg der Klauen oder das Fallen in den Staub. So lebt die jahrzehntelange Legende von <span className="lore-accent">spiderZ</span> im wahren Leben weiter – als eiserner Kodex auf dem Bambus.</p>

            <div className="lore-seal">✦</div>
            <div className="lore-video">
              <iframe
                src="https://www.youtube.com/embed/xg6dom7xZ1Y?start=198"
                title="Paaway Kaka — Feldaufnahme"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="lore-video-cap">Feldaufnahme · Paaway Kaka</div>
          </article>
          <button type="button" className="lore-close" onClick={() => setLoreOpen(false)} aria-label="Lore schließen">✕</button>
        </div>
      )}

      {error && (
        <div className="loader error">Fehler beim Laden: {error}</div>
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
                    className={`team-card${caught ? " is-caught" : ""}${p.id === boostedId ? " boosted" : ""}${vialTaken && boostedId == null && caught ? " vial-target" : ""}`}
                    style={{
                      "--tc": primary ? TYPE_COLORS[primary] : "var(--lila)",
                    }}
                    onClick={() => {
                      if (vialTaken && boostedId == null && caughtIds.includes(p.id)) {
                        setBoostedId(p.id);
                      }
                    }}
                  >
                    <img
                      src={p.artwork}
                      alt={p.name_de}
                      loading="eager"
                      style={caught ? { filter: `drop-shadow(0 0 22px ${primary ? TYPE_COLORS[primary] : "#6d28d9"}aa)` } : { filter: "grayscale(1) opacity(0.35)" }}
                    />
                    <div className="team-name">{p.name_de}</div>
                    <div className="team-meta">
                      <div className="card-types">
                        {(p.types || []).map((t) => (
                          <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] || "#6d28d9" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="team-avg">
                        Ø {(() => {
                          const arr = (p.stats || []).map((s) => s.value);
                          const sum = arr.length ? arr.reduce((a, b) => a + b, 0) : (p.strength || 0);
                          const n = arr.length || 1;
                          return Math.round(sum / n);
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </footer>

          {/* VIAL / STEROIDE: erscheint NACH dem Team-Reveal (verzoegert), blockiert Arena bis vergeben */}
          {revealed && data && caughtIds.length >= TOTAL_POKEMON && boostedId == null && (
            <section className="vial-stage">
              <h2 className="vial-title">STEROID-VIAL</h2>
              <p className="vial-sub">Nimm das Vial und verpasse EINER deiner Spinnen +100 Stärke.</p>
              <div
                className={`vial ${vialTaken ? "taken" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Steroid-Vial aufnehmen"
                onClick={() => setVialTaken(true)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setVialTaken(true); }}
              >
                <div className="vial-liquid" />
                <div className="vial-glass" />
                <div className="vial-cork" />
              </div>
              <p className="vial-hint">
                {vialTaken
                  ? "Wähle jetzt eine deiner Spinnen, um sie zu boosten."
                  : "Klicke das Vial, um es aufzunehmen."}
              </p>
            </section>
          )}

          {/* Cuteness-Overload: nur wenn Team komplett + Stärke < 1100 */}
          {data && caughtIds.length >= TOTAL_POKEMON && (() => {
            const ts = data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + (p.strength || 0), 0);
            return ts < 1100 ? <CutenessSection /> : null;
          })()}

          {/* ARENA: 3 gefangene vs 3 RNG-Gegner (1:1, Typ-Advantage = +100) */}
          {arenaMatches.length === TOTAL_POKEMON && (
            <section className="arena">
              <h2 className="arena-title">ARENA · DEIN TEAM VS RNG-SCHWARM</h2>
              <div className="arena-battles">
                {arenaMatches.map((m, i) => {
                  const { a, b, result } = m;
                  const pa = TYPE_COLORS[a.types[0]] || "#6d28d9";
                  const pb = TYPE_COLORS[b.types[0]] || "#6d28d9";
                  return (
                    <div className="vs-row" key={`${a.id}-${b.id}`}>
                      <div className={`vs-card own ${result.winner === "a" ? "win" : result.winner === "b" ? "lose" : "draw"}`} style={{ "--accent": pa }}>
                        <img src={a.artwork} alt={a.name_de} loading="lazy" />
                        <div className="vs-name">{a.name_de}</div>
                        <div className="vs-strength">
                          {a.strength}
                          {a.id === boostedId && <span className="boost-badge">+100</span>}
                          {result.bonusA > 0 && <span className="bonus-badge">+{BONUS}</span>}
                        </div>
                        <div className="card-types">
                          {a.types.map((t) => (
                            <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] || "#6d28d9" }}>{t}</span>
                          ))}
                        </div>
                      </div>

                      <div className="vs-mid">
                        <span className="vs-vs">VS</span>
                        <span className={`vs-result ${result.winner}`}>
                          {result.winner === "a" ? "SIEG" : result.winner === "b" ? "NIEDERLAGE" : "UNENTSCHIEDEN"}
                        </span>
                        {result.hasTypeWin && <span className="vs-typewin">TYP-VORTEIL +{BONUS}</span>}
                      </div>

                      <div className={`vs-card foe ${result.winner === "b" ? "win" : result.winner === "a" ? "lose" : "draw"}`} style={{ "--accent": pb }}>
                        <img src={b.artwork} alt={b.name_de} loading="lazy" />
                        <div className="vs-name">{b.name_de}</div>
                        <div className="vs-strength">
                          {b.strength}
                          {result.bonusB > 0 && <span className="bonus-badge">+{BONUS}</span>}
                        </div>
                        <div className="card-types">
                          {b.types.map((t) => (
                            <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] || "#6d28d9" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={arenaEndRef} className={`arena-result ${arenaWins > arenaLosses ? "win" : arenaLosses > arenaWins ? "lose" : "draw"}`}>
                GESAMT · {arenaWins} SIEGE — {arenaLosses} NIEDERLAGEN{arenaDraws ? ` — ${arenaDraws} UNENTSCHIEDEN` : ""}
              </div>
            </section>
          )}

          {/* BOOSTER-CTA: nach Durchscrollen der Ergebnisse, vor dem Booster-Screen */}
          {boosterCta && arenaWins >= 2 && !boosterOpen && (
            <div className="booster-cta-wrap">
              <button type="button" className="booster-cta" onClick={() => setBoosterOpen(true)}>
                <span className="booster-cta-arrow" aria-hidden="true">⬡</span>
                BOOSTER ÖFFNEN
                <span className="booster-cta-arrow" aria-hidden="true">⬡</span>
              </button>
            </div>
          )}

          {/* BOOSTER-SCREEN: nach Klick auf CTA */}
          {boosterOpen && arenaWins >= 2 && (
            <BoosterScreen onClose={() => setBoosterOpen(false)} />
          )}

        </main>
      )}
    </div>
  );
}

// ===== BOOSTER-SCREEN (Animation; Mechanik folgt spaeter) =====
function BoosterScreen({ onClose }) {
  const [phase, setPhase] = useState("idle"); // idle -> opening -> revealed
  const open = () => {
    if (phase !== "idle") return;
    if (navigator.vibrate) navigator.vibrate(30);
    setPhase("opening");
    setTimeout(() => setPhase("revealed"), 520);
  };
  const cards = [
    { type: "spider", icon: "🕷️", label: "NEUE SPINNE", rarity: "FREIGESCHALTET" },
    { type: "vial", icon: "💉", label: "STEROID-VIAL", rarity: "+1 DOPEN" },
    { type: "psa", icon: "🏆", label: "PSA 10", rarity: "SAMMEL-ITEM" },
  ];
  return (
    <div className={`booster-screen ${phase}`}>
      <div className="booster-stage">
        <div className="booster-pack" role="button" tabIndex={0} aria-label="Booster öffnen" onClick={open}
             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}>
          <div className="pack-body">
            <div className="pack-perf" />
            <div className="pack-top" />
            <div className="pack-foil" />
            <div className="pack-logo"><div className="big">SPIDER<span>Z</span></div><div className="sub">BOOSTER</div></div>
          </div>
          <div className="booster-burst">
            <svg viewBox="0 0 200 200"><g fill="none" stroke="url(#bg)" strokeWidth="3">
              <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#ff35d0" /></linearGradient></defs>
              <path d="M100 10 L100 60 M100 140 L100 190 M10 100 L60 100 M140 100 L190 100 M37 37 L73 73 M127 127 L163 163 M163 37 L127 73 M73 127 L37 163" />
            </g></svg>
          </div>
        </div>

        <div className="booster-cards">
          {cards.map((c) => (
            <div key={c.type} className={`booster-card type-${c.type} shimmer`}>
              <div className="icon">{c.icon}</div>
              <div className="label">{c.label}</div>
              <div className="rarity">{c.rarity}</div>
            </div>
          ))}
        </div>

        <div className="booster-hint">TIPPE ZUM ÖFFNEN</div>
      </div>
      <button type="button" className="booster-reset" onClick={onClose}>↻ WEITER</button>
    </div>
  );
}
