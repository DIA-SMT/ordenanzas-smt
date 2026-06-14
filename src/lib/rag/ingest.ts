import { createHash, randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "../supabase/server";
import { createEmbedding } from "../openrouter";
import { extractTextFromBuffer } from "./extractText";
import { buildChunks, inferTipo, inferNumero, type TipoNorma } from "./processNormativa";

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export interface IngestResult {
  documentoId: string;
  titulo: string;
  tipo: TipoNorma;
  numero: string;
  chunkCount: number;
}

/** Ingesta una normativa (PDF/DOCX/TXT) al store RAG: documento + chunks + embeddings. */
export async function ingestNormativa(
  file: File,
  opts: { titulo?: string; tipo?: TipoNorma } = {},
): Promise<IngestResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = sha256(buffer);
  const text = await extractTextFromBuffer(buffer, file.type || "application/pdf");
  const tipo = opts.tipo ?? inferTipo(file.name, text);
  const numero = inferNumero(file.name, text);
  const titulo = opts.titulo?.trim() || file.name;

  const supabase = createSupabaseAdminClient();

  const existing = await supabase
    .from("normativa_documentos")
    .select("id")
    .eq("checksum", checksum)
    .maybeSingle();
  if (existing.data?.id) throw new Error("Esa normativa ya fue cargada (checksum duplicado).");

  const { data: documento, error: docError } = await supabase
    .from("normativa_documentos")
    .insert({
      titulo,
      fuente: titulo,
      tipo,
      numero,
      mime_type: file.type || "application/pdf",
      file_path: `upload/${checksum}-${file.name}`.slice(0, 250),
      checksum,
      estado: "procesando",
    })
    .select("id")
    .single();
  if (docError || !documento) throw new Error(docError?.message ?? "No se pudo crear el documento.");

  const chunks = buildChunks(text);
  if (chunks.length === 0) {
    await supabase.from("normativa_documentos").update({ estado: "error", error_message: "Sin chunks" }).eq("id", documento.id);
    throw new Error("No se pudieron generar chunks válidos del documento.");
  }

  const rows = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    rows.push({
      documento_id: documento.id,
      chunk_uid: `${documento.id}:${i + 1}:${randomUUID()}`,
      contenido: chunk.contenido,
      embedding: await createEmbedding(chunk.contenido),
      metadata: {
        fuente: titulo,
        tipo,
        numero,
        articulo: chunk.articulo,
        seccion: chunk.seccion,
        pagina: null,
        documento_id: documento.id,
      },
    });
  }

  const { error: chunkError } = await supabase.from("normativa_chunks").insert(rows);
  if (chunkError) throw new Error(chunkError.message);

  await supabase
    .from("normativa_documentos")
    .update({ estado: "indexado", metadata: { chunk_count: rows.length } })
    .eq("id", documento.id);

  return { documentoId: documento.id, titulo, tipo, numero, chunkCount: rows.length };
}
