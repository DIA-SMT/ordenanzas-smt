import { NextRequest } from "next/server";
import { ingestNormativa } from "@/lib/rag/ingest";
import { hasEnv } from "@/lib/env";
import type { TipoNorma } from "@/lib/rag/processNormativa";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!hasEnv("OPENROUTER_API_KEY") || !hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return Response.json(
      { error: "Faltan OPENROUTER_API_KEY y/o SUPABASE_SERVICE_ROLE_KEY para indexar normativa." },
      { status: 503 },
    );
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    const titulo = (form.get("titulo") as string) || undefined;
    const tipo = (form.get("tipo") as TipoNorma) || undefined;
    if (!(file instanceof File)) return Response.json({ error: "Falta el archivo." }, { status: 400 });
    const result = await ingestNormativa(file, { titulo, tipo });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
