// Ingesta la Ordenanza 5487 al store RAG: chunks por artículo (con página y
// capítulo) + embeddings OpenRouter. Inserción directa vía pg.
// Requiere OPENROUTER_API_KEY. Uso: node scripts/ingest-5487.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
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
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_BASE = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const EMB_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
if (!DB_URL || !OR_KEY || OR_KEY === "PENDIENTE") {
  console.error("Faltan SUPABASE_DB_URL u OPENROUTER_API_KEY en .env.local");
  process.exit(1);
}

const CAP_TITULOS = {
  I: "Unidad de medida", II: "Contribuciones sobre los inmuebles", III: "Tributo Económico Municipal",
  IV: "Diversiones, espectáculos públicos y deportivos", V: "Publicidad y Propaganda",
  VI: "Mercados", VII: "Ocupación y/o uso de espacios de dominio público",
  VIII: "Mantenimiento del alumbrado público", IX: "Obras y mejoras del alumbrado público",
  X: "Agua, cloacas y gas natural por redes", XI: "Cementerios",
  XII: "Emplazamiento de estructuras soportes/portantes", XIII: "Verificación de mantenimiento de estructuras",
  XIV: "Construcción de obras privadas y fraccionamiento", XV: "Tasas de actuación administrativa",
  XVI: "Asistencia pública y protección sanitaria", XVII: "Servicios diversos",
  XVIII: "Rentas especiales", XIX: "Disposiciones generales y complementarias",
};

function chunkOrdenanza(text) {
  const parts = text.split(/========== PÁGINA (\d+) ==========/);
  const flat = [];
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10);
    const body = parts[i + 1] ?? "";
    for (const line of body.split("\n")) flat.push({ line, page: pageNum });
  }
  const chunks = [];
  let cap = "I";
  let current = null;
  const reArt = /^\s*Art(?:[íi]culo)?\.?\s*(\d+)\s*[°º]?\s*[.\-]/i;
  const reCap = /^\s*CAP[ÍI]TULO\s+([IVXL]+)\b/i;
  const flush = () => {
    if (current && current.text.trim().length > 60) {
      chunks.push({
        articulo: `Art. ${current.art}`, capitulo: current.cap, pagina: current.page,
        contenido: current.text.replace(/\n{2,}/g, "\n").trim(),
      });
    }
    current = null;
  };
  for (const { line, page } of flat) {
    const mc = line.match(reCap);
    if (mc) cap = mc[1].toUpperCase();
    const ma = line.match(reArt);
    if (ma) {
      flush();
      current = { art: ma[1], cap, page, text: line + "\n" };
    } else if (current) {
      current.text += line + "\n";
    }
  }
  flush();
  return chunks;
}

async function embed(input) {
  const res = await fetch(`${OR_BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OR_KEY}`, "Content-Type": "application/json", "X-Title": "Ordenanza SMT" },
    body: JSON.stringify({ model: EMB_MODEL, input }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const e = j?.data?.[0]?.embedding;
  if (!e) throw new Error("Sin embedding válido");
  return e;
}

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log("[ingest] iniciando…");
  await client.connect();
  const ocr = readFileSync(path.join(root, "src", "data", "ordenanza_5487_ocr.txt"), "utf-8");
  const chunks = chunkOrdenanza(ocr);
  console.log(`[chunk] ${chunks.length} artículos detectados.`);
  if (chunks.length === 0) throw new Error("No se detectaron artículos (revisar marcadores de página/regex).");

  const checksum = createHash("sha256").update(ocr).digest("hex");
  await client.query("delete from public.normativa_documentos where checksum=$1", [checksum]);
  const docId = randomUUID();
  await client.query(
    `insert into public.normativa_documentos (id,titulo,fuente,tipo,numero,fecha,mime_type,file_path,checksum,estado,metadata)
     values ($1,$2,$2,'ordenanza','5487/2025','2025-12-18','text/plain',$3,$4,'procesando','{}'::jsonb)`,
    [docId, "Ordenanza Tarifaria N° 5487/2025", `ordenanza-5487/${checksum}`, checksum],
  );

  let n = 0;
  for (const c of chunks) {
    const titulo = CAP_TITULOS[c.capitulo] ?? "";
    const contenido = `[Ordenanza Tarifaria 5487/2025 · Cap. ${c.capitulo} (${titulo}) · ${c.articulo} · pág. ${c.pagina}]\n${c.contenido}`;
    const emb = await embed(contenido);
    const meta = {
      fuente: "Ordenanza Tarifaria N° 5487/2025", tipo: "ordenanza", numero: "5487/2025",
      articulo: c.articulo, seccion: `Cap. ${c.capitulo} — ${titulo}`, capitulo: c.capitulo,
      pagina: c.pagina, documento_id: docId,
    };
    await client.query(
      `insert into public.normativa_chunks (documento_id,chunk_uid,contenido,embedding,metadata)
       values ($1,$2,$3,$4::vector,$5::jsonb)`,
      [docId, `${docId}:${++n}:${randomUUID()}`, contenido, `[${emb.join(",")}]`, JSON.stringify(meta)],
    );
    if (n % 10 === 0) console.log(`[embed] ${n}/${chunks.length}`);
  }
  await client.query("update public.normativa_documentos set estado='indexado', metadata=jsonb_build_object('chunk_count',$2::int) where id=$1", [docId, n]);
  console.log(`[ok] Ordenanza 5487 indexada: ${n} chunks.`);
  await client.end();
}

main().catch((e) => {
  console.error("[error]", e.message);
  process.exit(1);
});
