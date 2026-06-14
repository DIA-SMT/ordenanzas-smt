import { createSupabaseAdminClient } from "../supabase/server";
import { createEmbedding } from "../openrouter";

export interface NormativaMatch {
  chunk_id: number;
  documento_id: string;
  contenido: string;
  metadata: {
    fuente?: string;
    tipo?: string;
    numero?: string;
    articulo?: string | null;
    seccion?: string | null;
    pagina?: number | null;
    capitulo?: string | null;
  };
  score: number;
}

/** Búsqueda semántica sobre normativa_chunks vía el RPC match_normativa_chunks. */
export async function retrieveRelevantNormativa(input: {
  query: string;
  tipo?: string | null;
  fuente?: string | null;
  matchCount?: number;
}): Promise<NormativaMatch[]> {
  const embedding = await createEmbedding(input.query);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("match_normativa_chunks", {
    query_embedding: embedding,
    match_count: input.matchCount ?? 8,
    filter_tipo: input.tipo ?? null,
    filter_fuente: input.fuente ?? null,
    filter_fecha_desde: null,
    filter_fecha_hasta: null,
  });
  if (error) throw new Error(`Error recuperando normativa: ${error.message}`);
  return (data ?? []) as NormativaMatch[];
}
