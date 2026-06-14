import { env, optionalEnv } from "./env";

const BASE_URL = () => optionalEnv("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1";
const APP_TITLE = () => optionalEnv("OPENROUTER_APP_TITLE") ?? "Ordenanza SMT";
const EMBEDDING_MODEL = () =>
  optionalEnv("OPENROUTER_EMBEDDING_MODEL") ?? "openai/text-embedding-3-small";
const CHAT_MODEL = () => optionalEnv("OPENROUTER_CHAT_MODEL") ?? "openai/gpt-4.1-mini";

function headers() {
  return {
    Authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://ordenanza-smt.vercel.app",
    "X-Title": APP_TITLE(),
  };
}

export async function createEmbedding(input: string, model = EMBEDDING_MODEL()): Promise<number[]> {
  const response = await fetch(`${BASE_URL()}/embeddings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, input }),
  });
  if (!response.ok) {
    throw new Error(`OpenRouter embeddings error ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload?.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("OpenRouter no devolvió un embedding válido.");
  }
  return embedding;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Completion no-streaming (robusto en serverless). Devuelve el texto completo. */
export async function createChatCompletion(input: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<string> {
  const model = input.model ?? CHAT_MODEL();
  const response = await fetch(`${BASE_URL()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      messages: input.messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenRouter chat error ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

export async function streamChatCompletion(input: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const model = input.model ?? CHAT_MODEL();
  const response = await fetch(`${BASE_URL()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      stream: true,
      temperature: input.temperature ?? 0.2,
      messages: input.messages,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter chat error ${response.status}: ${await response.text()}`);
  }

  const upstream = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await upstream.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
          if (json?.choices?.[0]?.finish_reason) {
            controller.close();
            void upstream.cancel();
            return;
          }
        } catch {
          /* fragmento parcial */
        }
      }
    },
    cancel() {
      void upstream.cancel();
    },
  });
}
