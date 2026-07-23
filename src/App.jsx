import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePokemonData } from "./usePokemonData";
import { TOTAL_POKEMON, TYPE_COLORS } from "./pokemonList";
import PokemonCard from "./PokemonCard";
import ScrubSection from "./ScrubSection";
import SearchResult from "./SearchResult";
import HUD from "./HUD";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const { data, error, progress, search, runSearch, clearSearch } = usePokemonData(TOTAL_POKEMON);
  const [caughtIds, setCaughtIds] = useState([]);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const pulseRef = useRef(null); // HUD meldet hier pulse()-Methode an

  const scrollFillRef = useRef(null);

  // Globaler Scroll-Fortschritt fuer das HUD.
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
  // damit Pin-Distanzen (viewport-abhaengig) stimmen.
  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
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

  // Stabil memoizen: gleiche Referenz über alle Renders hinweg, damit das
  // useLayoutEffect in PokemonCard NICHT bei jedem App-Re-Render neu feuert
  // (das wuerde alle ScrollTrigger 60x/Sekunde killen + rebuilden -> Springen).
  // Level-Up erkennen (alle 100 XP = 2 neue Pokemon) -> HUD-Puls ausloesen.
  const handleReveal = useCallback((id) => {
    setCaughtIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      const oldLevel = Math.floor((prev.length * 50) / 100) + 1;
      const newLevel = Math.floor((next.length * 50) / 100) + 1;
      if (newLevel > oldLevel) pulseRef.current?.();
      return next;
    });
  }, []);

  return (
    <div className="app" ref={rootRef}>
      <HUD
        total={TOTAL_POKEMON}
        caughtIds={caughtIds}
        scrollFillRef={scrollFillRef}
        pulseRef={pulseRef}
      />

      <header className="hero">
        <ScrubSection />
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
                  </div>
                );
              })}
            </div>

            <p className="end-sub">
              Du hast <strong>{caughtIds.length}</strong> von{" "}
              <strong>{TOTAL_POKEMON}</strong> Pokémon freigeschaltet.
            </p>
            <p className="end-sub">Scroll zurück oder aktualisiere für eine neue zufällige Runde.</p>

            <form
              className="hero-search end-search"
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
          </footer>
        </main>
      )}
    </div>
  );
}
