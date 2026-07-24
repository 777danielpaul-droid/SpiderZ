// Führt supabase/schema.sql Statement-für-Statement via REST aus (service_role).
// Start: node scripts/run-schema.mjs
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { config } from "dotenv";

config();
const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) { console.error("FEHLER: Keys in .env fehlen."); process.exit(1); }

const sql = readFileSync(new NodeURL("../supabase/schema.sql", import.meta.url), "utf8");
// Statements splitten (grobe Splittung an ';' — unsere Kommentare enthalten keine ';').
const stmts = sql.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith("--"));

let ok = 0;
for (const stmt of stmts) {
  const u = `${URL}/rest/v1/?query=${encodeURIComponent(stmt)}`;
  const res = await fetch(u, {
    method: "GET",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("FEHLER bei Statement:\n", stmt.slice(0, 160));
    console.error("HTTP", res.status, text.slice(0, 400));
    process.exit(1);
  }
  ok++;
}
console.log(`SCHEMA OK — ${ok} Statements ausgeführt.`);
