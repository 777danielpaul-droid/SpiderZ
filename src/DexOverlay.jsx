import { loadDex } from "./storage";
import { TYPE_COLORS } from "./monList";

/**
 * Dex-Overlay: listet alle je gefangenen mon (aus localStorage).
 */
export default function DexOverlay({ onClose }) {
  const dex = loadDex();

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <span className="holo-glass" aria-hidden="true"></span>
      <div className="overlay-panel overlay-panel-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="overlay-close" onClick={onClose} aria-label="Zurück">←</button>
        <h2 className="overlay-title">NASAMON-DEX</h2>

        {dex.length === 0 ? (
          <p className="overlay-empty">Noch keine Monster gefangen. Fang eine Runde an!</p>
        ) : (
          <div className="dex-grid">
            {dex.map((p) => {
              const primary = p.types && p.types[0];
              const tc = primary ? TYPE_COLORS[primary] : "#6d28d9";
              return (
                <div className="dex-card" key={p.id} style={{ "--tc": tc }}>
                  <img className="dex-img" src={p.artwork} alt={p.name_de} loading="lazy" />
                  <div className="dex-meta">
                    <div className="dex-num">#{String(p.id).padStart(3, "0")}</div>
                    <div className="dex-name">{p.name_de}</div>
                    <div className="dex-str">STÄRKE {p.strength}</div>
                    <div className="dex-types">
                      {(p.types || []).map((t) => (
                        <span key={t} className="dex-type" style={{ background: TYPE_COLORS[t] }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
