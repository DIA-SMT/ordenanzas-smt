// Aplica el esquema SQL y carga la base madre de la Ordenanza 5487.
// Uso: node scripts/setup-db.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
loadEnv(path.join(root, ".env.local"));

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL || DB_URL.includes("PASSWORD")) {
  console.error("Falta SUPABASE_DB_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("[db] Conectado. Aplicando esquema…");
  const schema = readFileSync(path.join(root, "supabase", "schema.sql"), "utf-8");
  await client.query(schema);
  console.log("[db] Esquema aplicado (normativa_documentos, normativa_chunks, match RPC, base_madre_5487).");

  const rows = JSON.parse(readFileSync(path.join(root, "src", "data", "base_madre.json"), "utf-8"));
  console.log(`[db] Cargando ${rows.length} filas de base madre…`);
  await client.query("truncate public.base_madre_5487");
  const cols = [
    "id","pagina","capitulo","titulo_capitulo","articulo","inciso","tributo","rubro","actividad",
    "descripcion","sujeto","hecho","base_calculo","valor_pesos","valor_urbanos","alicuota","periodicidad",
    "momento_pago","area","tramite","claridad","sensibilidad","observaciones","referencia","confianza",
    "bloque_id","bloque",
  ];
  for (const r of rows) {
    const values = cols.map((c) => (r[c] === "" || r[c] === undefined ? null : r[c]));
    const ph = cols.map((_, i) => `$${i + 1}`).join(",");
    await client.query(`insert into public.base_madre_5487 (${cols.join(",")}) values (${ph})`, values);
  }
  const { rows: count } = await client.query("select count(*)::int as n from public.base_madre_5487");
  console.log(`[db] Base madre cargada: ${count[0].n} filas.`);
  await client.end();
  console.log("[ok] Setup completo.");
}

main().catch((e) => {
  console.error("[error]", e.message);
  process.exit(1);
});
