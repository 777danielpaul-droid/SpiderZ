import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabase, isSupabaseReady } from "./supabase";

/* ============================================================
   Auth-Layer für SpiderZ (Google OAuth, Supabase Auth).
   - Keine Passwörter in der App, Google übernimmt die Identität.
   - Session bleibt nach Reload via onAuthStateChange erhalten.
   - Graceful: ohne Supabase-Credentials -> user === null, kein Crash.
   ============================================================ */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseReady); // nur beim echten Auth-Init laden
  const [ready, setReady] = useState(!isSupabaseReady);      // false bis erste Session geprüft

  useEffect(() => {
    if (!isSupabaseReady) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    let active = true;

    // 1) Aktuelle Session direkt lesen (für Reload-Persistenz)
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
      setLoading(false);
    });

    // 2) Live-Updates (Login/Logout in anderem Tab, Token-Refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseReady) return { error: new Error("Supabase nicht konfiguriert.") };
    const supabase = getSupabase();
    // redirectTo: nach dem Google-Roundtrip zurück auf dieselbe Seite.
    // Wichtig: Die in Google Cloud Console hinterlegte "Authorized redirect URI"
    // muss die Supabase-Callback-URL sein:
    //   https://fxdrrowbzcddxmknjuvv.supabase.co/auth/v1/callback
    // Supabase verarbeitet den Code und redirectet dann zu dieser redirectTo-URL.
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { error: error ?? null };
  }, []);

  // Email + Password: Registrierung (neuer Account)
  const signUpWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseReady) return { error: new Error("Supabase nicht konfiguriert.") };
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Nach E-Mail-Bestätigung: zurück zur App
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    return { error: error ?? null };
  }, []);

  // Email + Password: Login (bestehender Account)
  const signInWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseReady) return { error: new Error("Supabase nicht konfiguriert.") };
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  // Passwort zurücksetzen (Sendet Magic-Link / Reset-Mail)
  const resetPassword = useCallback(async (email) => {
    if (!isSupabaseReady) return { error: new Error("Supabase nicht konfiguriert.") };
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + "?reset=true",
    });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseReady) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = {
    user, loading, ready, isSupabaseReady,
    signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword,
    signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von <AuthProvider> stehen.");
  return ctx;
}

/* ---- Cloud-Save Helpers (gebunden an die eingeloggte user_id) ---- */

// Liefert die gespeicherte Zeile oder null (kein Fehler-Crash).
export async function loadCloudSave() {
  if (!isSupabaseReady) return null;
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_saves")
    .select("caught_ids, best_team, best_team_strength, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) { console.warn("[cloud] load fehlgeschlagen:", error.message); return null; }
  return data;
}

// Upsert der eigenen Zeile (PK = user_id).
export async function saveCloudSave({ caughtIds, bestTeam, bestTeamStrength }) {
  if (!isSupabaseReady) return false;
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("user_saves")
    .upsert(
      {
        user_id: user.id,
        caught_ids: caughtIds,
        best_team: bestTeam,
        best_team_strength: bestTeamStrength,
      },
      { onConflict: "user_id" }
    );
  if (error) { console.warn("[cloud] save fehlgeschlagen:", error.message); return false; }
  return true;
}
