// Recarga base_madre_5487 (105 filas) e ingesta cada concepto como chunk RAG.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const DB_URL = process.env.SUPABASE_DB_URL;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_BASE = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const EMB_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";

const CAP = {
  I:"Unidad de medida",II:"Contribuciones sobre los inmuebles",III:"Tributo Económico Municipal",
  IV:"Diversiones, espectáculos públicos y deportivos",V:"Publicidad y Propaganda",VI:"Mercados",
  VII:"Ocupación y/o uso de espacios de dominio público",VIII:"Mantenimiento del alumbrado público",
  IX:"Obras y mejoras del alumbrado público",X:"Agua, cloacas y gas natural por redes",XI:"Cementerios",
  XII:"Emplazamiento de estructuras soportes/portantes",XIII:"Verificación de mantenimiento de estructuras",
  XIV:"Construcción de obras privadas y fraccionamiento",XV:"Tasas de actuación administrativa",
  XVI:"Asistencia pública y protección sanitaria",XVII:"Servicios diversos",XVIII:"Rentas especiales",
  XIX:"Disposiciones generales y complementarias",
};

function chunkText(r) {
  const valor = r.valor_urbanos != null
    ? `${r.valor_urbanos} U (≈ $${Math.round((r.valor_pesos ?? r.valor_urbanos * 23))})`
    : (r.alicuota || "—");
  return [
    `[Ordenanza Tarifaria N° 5487/2025 · Cap. ${r.capitulo} (${CAP[r.capitulo] ?? ""}) · ${r.articulo}${r.inciso && r.inciso !== "—" ? " " + r.inciso : ""} · pág. ${r.pagina} · ${r.referencia}]`,
    `Concepto: ${r.actividad}. ${r.descripcion}`,
    `Tributo: ${r.tributo}. Rubro: ${r.rubro}.`,
    r.hecho && r.hecho !== "—" ? `Hecho imponible: ${r.hecho}` : "",
    r.sujeto && r.sujeto !== "—" ? `Sujeto obligado: ${r.sujeto}.` : "",
    r.base_calculo && r.base_calculo !== "—" ? `Base de cálculo: ${r.base_calculo}.` : "",
    `Valor: ${valor}. Alícuota/porcentaje: ${r.alicuota || "—"}.`,
    `Periodicidad: ${r.periodicidad || "—"}. Momento de pago: ${r.momento_pago || "—"}.`,
    r.area && r.area !== "—" ? `Área municipal: ${r.area}.` : "",
    r.tramite && r.tramite !== "—" ? `Trámite/documento: ${r.tramite}.` : "",
    r.observaciones ? `Observaciones: ${r.observaciones}` : "",
    `(1 Urbano = $23,00, Art. 1°.)`,
  ].filter(Boolean).join("\n");
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

const cols = ["id","pagina","capitulo","titulo_capitulo","articulo","inciso","tributo","rubro","actividad",
  "descripcion","sujeto","hecho","base_calculo","valor_pesos","valor_urbanos","alicuota","periodicidad",
  "momento_pago","area","tramite","claridad","sensibilidad","observaciones","referencia","confianza","bloque_id","bloque"];

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const rows = JSON.parse(readFileSync(path.join(root, "src", "data", "base_madre.json"), "utf-8"));
  console.log(`[base] ${rows.length} conceptos.`);

  // 1) recargar base_madre_5487
  await client.query("truncate public.base_madre_5487");
  for (const r of rows) {
    const vals = cols.map((c) => (r[c] === "" || r[c] === undefined ? null : r[c]));
    await client.query(
      `insert into public.base_madre_5487 (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
      vals,
    );
  }
  console.log("[base] base_madre_5487 recargada.");

  // 2) ingestar chunks RAG
  const checksum = "ord5487-basemadre-v1";
  await client.query("delete from public.normativa_documentos where checksum=$1", [checksum]);
  const docId = randomUUID();
  await client.query(
    `insert into public.normativa_documentos (id,titulo,fuente,tipo,numero,fecha,mime_type,file_path,checksum,estado,metadata)
     values ($1,$2,$2,'ordenanza','5487/2025','2025-12-18','text/plain',$3,$4,'procesando','{}'::jsonb)`,
    [docId, "Ordenanza Tarifaria N° 5487/2025", `ordenanza-5487/${checksum}`, checksum],
  );

  let n = 0;
  for (const r of rows) {
    const contenido = chunkText(r);
    const emb = await embed(contenido);
    const meta = {
      fuente: "Ordenanza Tarifaria N° 5487/2025", tipo: "ordenanza", numero: "5487/2025",
      articulo: r.articulo, seccion: `Cap. ${r.capitulo} — ${CAP[r.capitulo] ?? ""}`,
      capitulo: r.capitulo, pagina: r.pagina, bloque: r.bloque, concepto_id: r.id, documento_id: docId,
    };
    await client.query(
      `insert into public.normativa_chunks (documento_id,chunk_uid,contenido,embedding,metadata)
       values ($1,$2,$3,$4::vector,$5::jsonb)`,
      [docId, `${docId}:${++n}:${randomUUID()}`, contenido, `[${emb.join(",")}]`, JSON.stringify(meta)],
    );
    if (n % 20 === 0) console.log(`[embed] ${n}/${rows.length}`);
  }
  await client.query("update public.normativa_documentos set estado='indexado', metadata=jsonb_build_object('chunk_count',$2::int) where id=$1", [docId, n]);
  console.log(`[ok] Ingestados ${n} chunks RAG de la Ordenanza 5487.`);
  await client.end();
}

main().catch((e) => { console.error("[error]", e.message); process.exit(1); });
