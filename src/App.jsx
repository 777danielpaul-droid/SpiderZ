import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { usePokemonData } from "./usePokemonData";
import { TOTAL_POKEMON, TYPE_COLORS } from "./pokemonList";
import PokemonCard from "./PokemonCard";
import ScrubSection from "./ScrubSection";
import SearchResult from "./SearchResult";
import HUD from "./HUD";
import "./App.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function App() {
  const { data, error, progress, search, runSearch, clearSearch } = usePokemonData(TOTAL_POKEMON);
  const [caughtIds, setCaughtIds] = useState([]);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const [hudVisible, setHudVisible] = useState(false);
  const [activeCard, setActiveCard] = useState(0); // Index des aktiven Pokemon

  const scrollFillRef = useRef(null);
  const stRef = useRef(null);
  const cardTrgRef = useRef([]); // ScrollTrigger je Karte (fuer "Weiter"-Button)

  // "Weiter"-Button: smooth zum naechsten Pokemon (oder ans Team-Ende).
  const goNext = useCallback(() => {
    const next = Math.min(activeCard + 1, TOTAL_POKEMON);
    const trg = cardTrgRef.current[next];
    if (trg) {
      const y = trg.start + window.innerHeight * 0.5; // mitte der Karte
      gsap.to(window, { scrollTo: y, duration: 0.8, ease: "power2.inOut" });
    } else if (next >= TOTAL_POKEMON) {
      const footer = document.querySelector(".endcard");
      if (footer) gsap.to(window, { scrollTo: footer, duration: 0.9, ease: "power2.inOut" });
    }
    setActiveCard(next);
  }, [activeCard]);

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
      <HUD
        total={TOTAL_POKEMON}
        caughtIds={caughtIds}
        data={data}
        scrollFillRef={scrollFillRef}
        visible={hudVisible}
      />

      <header className="hero" ref={heroRef}>
        <ScrubSection>
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

          <footer className="endcard">
            <h2 className="end-title">
              {caughtIds.length >= TOTAL_POKEMON ? "Dein Team ist komplett" : "Dein Team"}
            </h2>

            <div className="team-grid">
              {data.map((p) => {
                const caught = caughtIds.includes(p.id);
                const primary = p.types && p.types[0];
                return (
                  <div
                    key={p.name_en}
                    className={`team-card${caught ? " is-caught" : ""}`}
                  >
                    <img
                      src={p.artwork}
                      alt={p.name_de}
                      loading="lazy"
                      style={caught ? { filter: `drop-shadow(0 0 22px ${primary ? TYPE_COLORS[primary] : "#6d28d9"}aa)` } : { filter: "grayscale(1) opacity(0.35)" }}
                    />
                    <span className="team-name">{caught ? p.name_de : "???"}</span>
                    <span className="team-strength">{caught ? `STÄRKE ${p.strength}` : ""}</span>
                  </div>
                );
              })}
            </div>

            {caughtIds.length > 0 && (
              <p className="team-total">
                Team-Stärke: <strong>{data.filter((p) => caughtIds.includes(p.id)).reduce((s, p) => s + p.strength, 0)}</strong>
              </p>
            )}

            <p className="end-sub">
              Du hast <strong>{caughtIds.length}</strong> von{" "}
              <strong>{TOTAL_POKEMON}</strong> Pokémon freigeschaltet.
            </p>
            <p className="end-sub">Scroll zurück oder aktualisiere für eine neue zufällige Runde.</p>
          </footer>
        </main>
      )}

      <button className="next-btn" onClick={goNext} aria-label="Nächstes Pokémon">
        {activeCard >= TOTAL_POKEMON ? "Zum Team ▾" : "Weiter ▸"}
      </button>
    </div>
  );
}
