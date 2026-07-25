import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Wenn die Env-Vars fehlen (z.B. auf GitHub Pages ohne Secrets),
// nicht hart crashen -> Client lazy + Flag, App zeigt saubere Meldung.
export const isSupabaseReady = Boolean(url && key);

let _client = null;
export function getSupabase() {
  if (!isSupabaseReady) return null;
  if (!_client) _client = createClient(url, key);
  return _client;
}

// Anon-Client: nur Lese-Zugriff (RLS erlaubt public SELECT).
// Bleibt undefined, wenn keine Credentials da sind -> kein White-Screen.
export const supabase = isSupabaseReady ? createClient(url, key) : null;

if (!isSupabaseReady) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. " +
      "Kopiere .env.example nach .env und trage deine Zugänge ein."
  );
}
