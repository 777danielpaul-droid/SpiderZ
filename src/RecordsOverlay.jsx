import { loadBestTeamStrength, loadDex } from "./storage";

/**
 * Records-Overlay: zeigt den Rekord (hoechste Team-Staerke) + Anzahl
 * gefangener Pokemon. Button fuehrt zum eigentlichen Dex.
 */
export default function RecordsOverlay({ onClose, onOpenDex }) {
  const best = loadBestTeamStrength();
  const dex = loadDex();

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="overlay-close" onClick={onClose} aria-label="Schließen">✕</button>
        <h2 className="overlay-title">REKORDE</h2>

        <div className="records-grid">
          <div className="record-card">
            <div className="record-label">BESTE TEAM-STÄRKE</div>
            <div className="record-value">{best}</div>
          </div>
          <div className="record-card">
            <div className="record-label">GEFANGEN (DEX)</div>
            <div className="record-value">{dex.length}</div>
          </div>
        </div>

        <button type="button" className="overlay-cta" onClick={onOpenDex}>
          ZUM POKÉDEX →
        </button>
      </div>
    </div>
  );
}
