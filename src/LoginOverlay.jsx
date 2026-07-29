import { useState } from "react";
import { useAuth } from "./lib/auth.jsx";

/* ============================================================
   LoginOverlay — Holo-Glass Modal für Auth (Google OAuth + Email).
   Look passend zu .lore-modal (dunkles Glas + Neon + Holo-Spark).
   Schließbar per Escape / Klick auf Backdrop.

   Tabs:
     [0] Google OAuth  (falls funktioniert)
     [1] Email + Passwort  (Login / Registrierung / Reset)
   ============================================================ */

export default function LoginOverlay({ onClose }) {
  const {
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    isSupabaseReady,
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Tab state: 0 = Google, 1 = Email
  const [tab, setTab] = useState(1); // Email als Standard

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false); // false = Login, true = Registrierung
  const [showReset, setShowReset] = useState(false);  // true = Passwort zurücksetzen

  // Escape schließt das Overlay.
  const handleKey = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  // --- Google OAuth ---
  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setBusy(false);
      setError(error.message || "Login fehlgeschlagen.");
    }
  };

  // --- Email: Login oder Registrierung ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    if (showReset) {
      // Passwort zurücksetzen
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message || "Fehler beim Zurücksetzen.");
      } else {
        setSuccess("Prüfe deine E-Mails für den Reset-Link.");
        setShowReset(false);
      }
    } else if (isRegister) {
      // Registrierung
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error.message || "Registrierung fehlgeschlagen.");
      } else {
        setSuccess("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
      }
    } else {
      // Login
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message || "Login fehlgeschlagen.");
      } else {
        setSuccess("Angemeldet!");
      }
    }

    setBusy(false);
  };

  return (
    <div
      className="login-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Anmelden"
      onKeyDown={handleKey}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="login-panel">
        <span className="holo-glass" aria-hidden="true"></span>

        <button
          type="button"
          className="login-close"
          onClick={onClose}
          aria-label="Schließen"
        >✕</button>

        <div className="login-badge">// CLOUD_SYNC</div>
        <h2 className="login-title">SPIDER<span>Z</span> CLOUD</h2>
        <p className="login-sub">
          Verbinde dein Team mit der Cloud — fang überall da weiter, wo du aufgehört hast.
        </p>

        {!isSupabaseReady ? (
          <p className="login-warn">
            Supabase ist nicht konfiguriert. Trage <code>VITE_SUPABASE_URL</code> /
            <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> ein.
          </p>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${tab === 0 ? "active" : ""}`}
                onClick={() => { setTab(0); setError(null); setSuccess(null); }}
              >
                Google
              </button>
              <button
                type="button"
                className={`login-tab ${tab === 1 ? "active" : ""}`}
                onClick={() => { setTab(1); setError(null); setSuccess(null); }}
              >
                E-Mail
              </button>
            </div>

            {/* Tab 0: Google OAuth */}
            {tab === 0 && (
              <button
                type="button"
                className="login-google"
                onClick={handleGoogle}
                disabled={busy}
              >
                <span className="login-google-icon" aria-hidden="true">
                  {/* Google "G" (4 Farben, inline SVG) */}
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                  </svg>
                </span>
                {busy ? "Verbinde…" : "Mit Google weiterspielen"}
              </button>
            )}

            {/* Tab 1: Email + Password */}
            {tab === 1 && (
              <form className="login-email-form" onSubmit={handleEmailSubmit}>
                <div className="login-field">
                  <label htmlFor="login-email">E-Mail</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    required
                  />
                </div>

                {!showReset && (
                  <div className="login-field">
                    <label htmlFor="login-password">Passwort</label>
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      required
                      minLength={6}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="login-submit"
                  disabled={busy || !email || (!showReset && !password)}
                >
                  {busy
                    ? "Verarbeite…"
                    : showReset
                      ? "Reset-Link senden"
                      : isRegister
                        ? "Registrieren"
                        : "Anmelden"}
                </button>

                {/* Toggle Login / Register / Reset */}
                <div className="login-toggle">
                  {showReset ? (
                    <button
                      type="button"
                      className="login-link"
                      onClick={() => setShowReset(false)}
                    >
                      ← Zurück zum Login
                    </button>
                  ) : (
                    <>
                      <label className="login-checkbox-row">
                        <input
                          type="checkbox"
                          checked={isRegister}
                          onChange={(e) => setIsRegister(e.target.checked)}
                          disabled={busy}
                        />
                        <span>Neuen Account erstellen</span>
                      </label>
                      <button
                        type="button"
                        className="login-link"
                        onClick={() => setShowReset(true)}
                      >
                        Passwort vergessen?
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}

            {error && <p className="login-error">{error}</p>}
            {success && <p className="login-success">{success}</p>}
          </>
        )}

        <p className="login-foot">
          Kein Passwort nötig — Google übernimmt die Anmeldung. Dein Spielstand bleibt nur bei dir.
        </p>
      </div>
    </div>
  );
}
