import { TYPE_COLORS } from "./monList";

// Modal-Ergebnis der Header-Suche: zeigt ein einzelnes Monster ohne
// Scroll-Transformation (reines Datenblatt). Schließbar via X / Klick außerhalb.
export default function SearchResult({ result, error, loading, onClose }) {
  if (loading) {
    return (
      <div className="search-modal" onClick={onClose}>
        <span className="holo-glass" aria-hidden="true"></span>
        <div className="search-card" onClick={(e) => e.stopPropagation()}>
          <div className="search-spinner" />
          <p>Suche …</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-modal" onClick={onClose}>
        <span className="holo-glass" aria-hidden="true"></span>
        <div className="search-card" onClick={(e) => e.stopPropagation()}>
          <button className="search-close" onClick={onClose} aria-label="Schließen">×</button>
          <div className="search-emoji">🔍</div>
          <p className="search-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const p = result;
  const primary = TYPE_COLORS[p.types[0]] || "#6d28d9";
  const secondary = TYPE_COLORS[p.types[1]] || primary;
  const total = p.stats.reduce((s, x) => s + x.value, 0);

  return (
    <div className="search-modal" onClick={onClose}>
      <div
        className="search-card"
        onClick={(e) => e.stopPropagation()}
        style={{ "--accent": primary }}
      >
        <button className="search-close" onClick={onClose} aria-label="Schließen">×</button>

        <div
          className="search-bg"
          style={{
            background: `radial-gradient(circle, ${primary}55, transparent 70%)`,
          }}
        />
        <div className="search-num">#{String(p.id).padStart(3, "0")}</div>

        <div className="search-body">
          <div className="search-art">
            <img src={p.artwork} alt={p.name_de} />
            <div className="card-types">
              {p.types.map((t) => (
                <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="search-panel">
            <h2>{p.name_de}</h2>
            <p className="card-sub">
              #{String(p.id).padStart(3, "0")} · {p.height / 10} m · {p.weight / 10} kg
            </p>
            <div className="stat-grid">
              {p.stats.map((s) => (
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
            <div className="stat-total" style={{ color: primary }}>BST {total}</div>
          </div>
        </div>

        <div className="search-alt" style={{ color: secondary }}>
          EN: {p.name_en}
        </div>
      </div>
    </div>
  );
}
