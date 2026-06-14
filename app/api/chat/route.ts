import { NextRequest } from "next/server";
import { retrieveRelevantNormativa } from "@/lib/rag/retrieve";
import { createChatCompletion, type ChatMessage } from "@/lib/openrouter";
import { hasEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Sos el asistente normativo de la Municipalidad de San Miguel de Tucumán.
Respondés consultas sobre normativa tributaria municipal, en español claro y conciso, con tono institucional.

REGLAS:
- Respondé ÚNICAMENTE con base en los fragmentos de normativa provistos en el CONTEXTO.
- Si el contexto no alcanza para responder, decilo explícitamente y sugerí reformular o cargar la norma.
- Citá siempre el artículo y, si está, la página y el número de norma (ej.: "Art. 20, pág. 13, Ord. 5487/2025").
- Cuando des montos, aclará que 1 Urbano (U) = $23,00 (Art. 1° de la Ord. 5487/2025) y que son valores de referencia.
- No inventes cifras ni artículos que no estén en el contexto.
- Si los fragmentos del contexto NO se relacionan claramente con la consulta, respondé: "No encuentro base suficiente en la normativa cargada para responder con certeza" y sugerí reformular o cargar la norma específica. No completes con conocimiento general.
- Distinguí lo que está expresamente en la norma de cualquier inferencia, y aclará las inferencias.
- Sé breve: 1 a 4 párrafos, o una lista si corresponde.`;

export async function POST(req: NextRequest) {
  if (!hasEnv("OPENROUTER_API_KEY") || !hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return Response.json(
      {
        error:
          "El asistente todavía no está configurado: faltan las claves OPENROUTER_API_KEY y/o SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((m) => m.role && m.content);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return Response.json({ error: "Falta la consulta." }, { status: 400 });

  let matches;
  try {
    matches = await retrieveRelevantNormativa({ query: lastUser.content, matchCount: 8 });
  } catch (e) {
    return Response.json({ error: `Error de recuperación: ${(e as Error).message}` }, { status: 500 });
  }

  const contexto = matches
    .map((m, i) => {
      const md = m.metadata ?? {};
      const ref = [
        md.fuente ?? "Normativa",
        md.articulo ? `${md.articulo}` : null,
        md.pagina ? `pág. ${md.pagina}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `[Fragmento ${i + 1} | ${ref}]\n${m.contenido}`;
    })
    .join("\n\n---\n\n");

  const citations = matches.map((m) => ({
    fuente: m.metadata?.fuente ?? "Normativa",
    articulo: m.metadata?.articulo ?? null,
    pagina: m.metadata?.pagina ?? null,
    capitulo: (m.metadata as { capitulo?: string })?.capitulo ?? null,
    score: Math.round((m.score ?? 0) * 100),
    snippet: m.contenido.replace(/^\[[^\]]+\]\n/, "").slice(0, 220),
  }));

  const llmMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...messages.slice(-6, -1),
    {
      role: "user",
      content: `CONTEXTO (fragmentos de normativa recuperados):\n\n${contexto}\n\n---\n\nCONSULTA: ${lastUser.content}`,
    },
  ];

  try {
    const answer = await createChatCompletion({ messages: llmMessages });
    return new Response(answer, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Citations": Buffer.from(JSON.stringify(citations)).toString("base64"),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json({ error: `Error del modelo: ${(e as Error).message}` }, { status: 500 });
  }
}
