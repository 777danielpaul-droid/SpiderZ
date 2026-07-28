import { useEffect, useRef } from "react";
import { useAuth, loadCloudSave, saveCloudSave } from "./lib/auth.jsx";
import {
  loadDex, saveCaught,
  loadBestTeamStrength, saveBestTeamStrength,
} from "./storage";

/* ============================================================
   useCloudSave — verbindet den lokalen Spielstand (localStorage)
   mit dem Cloud-Sync (Supabase user_saves).

   - Beim Login: Cloud-Stand laden, mit localStorage mergen
     (neuester updated_at gewinnt), lokal spiegeln.
   - Bei jeder Änderung von caughtIds / bestTeamStrength:
       * localStorage sofort aktualisieren (Offline-Fallback)
       * Cloud debounced (~700ms) schreiben (nur wenn eingeloggt)
   - Beim Logout: nur noch localStorage (Cloud-Write stoppt).
   ============================================================ */

const DEBOUNCE_MS = 700;

export function useCloudSave({ caughtIds, bestTeamStrength, bestTeam }) {
  const { user, ready, isSupabaseReady } = useAuth();
  const loggedIn = Boolean(user);

  // Hat bereits gemergt -> verhindert Doppel-Merge bei StrictMode-Remount.
  const mergedRef = useRef(false);
  const timerRef = useRef(null);
  // letzter geschriebener Stand (Damit wir nur bei echter Änderung schreiben).
  const lastRef = useRef({ caught: "", best: -1, team: "" });

  // --- Merge beim Login (einmalig pro Session) ---
  useEffect(() => {
    if (!loggedIn || !ready || mergedRef.current) return;
    mergedRef.current = true;

    (async () => {
      const cloud = await loadCloudSave();
      if (!cloud) {
        // Noch kein Cloud-Stand: lokalen Stand hochladen.
        const localDex = loadDex();
        const localBest = loadBestTeamStrength();
        if (localDex.length || localBest) {
          await saveCloudSave({
            caughtIds: localDex.map((p) => p.id),
            bestTeam: bestTeam ?? [],
            bestTeamStrength: localBest,
          });
        }
        return;
      }

      // Cloud vorhanden -> lokale Daten als Fallback / Merge-Basis nehmen.
      const localDex = loadDex();
      const localBest = loadBestTeamStrength();
      const cloudIds = Array.isArray(cloud.caught_ids) ? cloud.caught_ids : [];
      const cloudBest = Number(cloud.best_team_strength) || 0;

      // Union der IDs (beide Seiten behalten gefangene Spider).
      const mergedMap = new Map();
      for (const p of localDex) mergedMap.set(p.id, p);
      // Cloud-Team als Quelle für Namens/Artwork (falls lokal älter).
      const cloudTeamById = new Map(
        (Array.isArray(cloud.best_team) ? cloud.best_team : []).map((t) => [t.id, t])
      );
      for (const id of cloudIds) {
        if (!mergedMap.has(id) && cloudTeamById.has(id)) mergedMap.set(id, cloudTeamById.get(id));
      }
      const mergedDex = [...mergedMap.values()].sort((a, b) => a.id - b.id);

      // Bestes Team: höherer Wert gewinnt.
      const mergedBest = Math.max(localBest, cloudBest);

      // Zurück in localStorage spiegeln (UI liest daraus).
      saveCaught(mergedDex);
      if (mergedBest > localBest) saveBestTeamStrength(mergedBest);

      // Falls Cloud weniger hatte als lokal -> lokalen Stand in Cloud nachziehen.
      if (mergedBest > cloudBest || mergedDex.length > cloudIds.length) {
        await saveCloudSave({
          caughtIds: mergedDex.map((p) => p.id),
          bestTeam: bestTeam ?? (Array.isArray(cloud.best_team) ? cloud.best_team : []),
          bestTeamStrength: mergedBest,
        });
      }
    })();
  }, [loggedIn, ready, bestTeam]);

  // --- Schreiben bei Änderung (debounced) ---
  useEffect(() => {
    if (!loggedIn || !ready || !isSupabaseReady) return;
    if (!caughtIds || bestTeamStrength == null) return;

    const caughtKey = (caughtIds || []).join(",");
    const teamKey = JSON.stringify(bestTeam ?? []);
    const last = lastRef.current;
    if (last.caught === caughtKey && last.best === bestTeamStrength && last.team === teamKey) {
      return; // keine echte Änderung
    }

    // localStorage sofort (Offline-Fallback, kein Debounce).
    if (caughtIds.length) {
      const dex = loadDex();
      const map = new Map(dex.map((p) => [p.id, p]));
      // bestTeam enthält die vollen Objekte -> als Dex-Quelle nutzen.
      for (const p of (bestTeam ?? [])) if (p && p.id) map.set(p.id, p);
      saveCaught([...map.values()]);
    }
    if (bestTeamStrength > 0) saveBestTeamStrength(bestTeamStrength);

    // Cloud debounced schreiben.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const ok = await saveCloudSave({
        caughtIds: caughtIds,
        bestTeam: bestTeam ?? [],
        bestTeamStrength: bestTeamStrength,
      });
      if (ok) {
        lastRef.current = { caught: caughtKey, best: bestTeamStrength, team: teamKey };
      }
    }, DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loggedIn, ready, isSupabaseReady, caughtIds, bestTeamStrength, bestTeam]);
}
