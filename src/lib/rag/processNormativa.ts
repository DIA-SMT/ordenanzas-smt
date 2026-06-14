import { createHash } from "node:crypto";

export type TipoNorma = "ordenanza" | "decreto" | "ley" | "reglamento" | "resolucion" | "otro";

export interface ChunkMetadata {
  contenido: string;
  articulo: string | null;
  seccion: string | null;
}

const DEFAULT_MIN_CHUNK_LENGTH = 100;
const MAX_CHUNK_CHARS = 16000;

const HEADING_LINE_REGEX =
  /^(?!ART[ÍI]CULO\b)(?=.{4,120}$)(?!.*\b(?:PAGINA|P[AÁ]GINA)\b)([A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9\s,.;:/()\-]{3,})$/;
const ARTICLE_LINE_REGEX =
  /^ART[ÍI]CULO\s+((?:\d+|[IVXLCDM]+)(?:\s*[°º])?(?:\s*BIS)?(?:\s+[A-Z])?)\s*[:.\-)]?\s*/i;

export function cleanText(rawText: string): string {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ /g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\bA R T I C U L O\b/gi, "ARTICULO")
    .replace(/\bC A P I T U L O\b/gi, "CAPITULO")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/\bArt\.?\s+(\d)/gi, "ARTICULO $1")
    .replace(/[ \t]+\./g, ".")
    .replace(/[ \t]+,/g, ",")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isMostlyUppercase(line: string): boolean {
  const letters = line.match(/[A-ZÁÉÍÓÚÜÑ]/g) ?? [];
  const lower = line.match(/[a-záéíóúüñ]/g) ?? [];
  return letters.length >= 4 && lower.length === 0;
}

function normalizeArticleLabel(rawArticle: string): string {
  return rawArticle.replace(/\s+/g, " ").replace(/[º°]/g, "º").replace(/\bBIS\b/i, "Bis").trim();
}

function parseArticleOrder(article: string): number {
  const match = article.match(/^(\d+|[IVXLCDM]+)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const token = match[1].toUpperCase();
  if (/^\d+$/.test(token)) return Number(token);
  const roman: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  let prev = 0;
  for (const ch of token.split("").reverse()) {
    const v = roman[ch] ?? 0;
    total += v < prev ? -v : v;
    prev = v;
  }
  return total;
}

function extractArticleHeadings(text: string) {
  const lines = text.split("\n");
  const headings: Array<{ articulo: string; start: number }> = [];
  let cursor = 0;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const lineStart = cursor;
    cursor += rawLine.length + 1;
    if (!trimmed) continue;
    const match = trimmed.match(ARTICLE_LINE_REGEX);
    if (!match) continue;
    const articulo = normalizeArticleLabel(match[1] ?? "");
    if (!articulo) continue;
    headings.push({ articulo, start: lineStart + (rawLine.search(/\S|$/) || 0) });
  }
  return headings;
}

function filterArticleHeadings(headings: Array<{ articulo: string; start: number }>) {
  const filtered: Array<{ articulo: string; start: number }> = [];
  for (const heading of headings) {
    const currentOrder = parseArticleOrder(heading.articulo);
    const previous = filtered.at(-1);
    if (!previous) {
      filtered.push(heading);
      continue;
    }
    const previousOrder = parseArticleOrder(previous.articulo);
    const isBis = currentOrder === previousOrder && heading.articulo.toUpperCase().includes("BIS");
    const ascending = currentOrder >= previousOrder;
    const near = currentOrder - previousOrder <= 5;
    if (isBis || (ascending && near) || currentOrder === previousOrder) filtered.push(heading);
  }
  return filtered;
}

export function chunkByArticles(text: string, minLength = DEFAULT_MIN_CHUNK_LENGTH): ChunkMetadata[] {
  const matches = filterArticleHeadings(extractArticleHeadings(text));
  if (matches.length === 0) return [];
  const chunks: ChunkMetadata[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;
    const contenido = cleanText(text.slice(start, end).trim());
    if (contenido.length < minLength) continue;
    chunks.push({ contenido, articulo: matches[i].articulo, seccion: null });
  }
  return chunks;
}

export function chunkBySections(text: string, minLength = DEFAULT_MIN_CHUNK_LENGTH): ChunkMetadata[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const chunks: ChunkMetadata[] = [];
  let currentSection = "TEXTO_GENERAL";
  let current: string[] = [];
  const flush = () => {
    const contenido = cleanText(current.join("\n"));
    if (contenido.length >= minLength) chunks.push({ contenido, articulo: null, seccion: currentSection });
    current = [];
  };
  for (const line of lines) {
    const isHeading = HEADING_LINE_REGEX.test(line) && isMostlyUppercase(line) && line.split(" ").length <= 12;
    if (isHeading) {
      if (current.length > 0) flush();
      currentSection = line.replace(/\s+/g, " ").trim();
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) flush();
  return chunks;
}

export function enforceMaxChunkSize(chunks: ChunkMetadata[]): ChunkMetadata[] {
  const result: ChunkMetadata[] = [];
  for (const chunk of chunks) {
    if (chunk.contenido.length <= MAX_CHUNK_CHARS) {
      result.push(chunk);
      continue;
    }
    const text = chunk.contenido;
    let start = 0;
    let part = 1;
    while (start < text.length) {
      let end = start + MAX_CHUNK_CHARS;
      if (end < text.length) {
        let br = text.lastIndexOf("\n\n", end);
        if (br <= start) br = text.lastIndexOf(". ", end);
        if (br > start) end = br + 1;
      }
      result.push({
        contenido: text.slice(start, end).trim(),
        articulo: chunk.articulo ? `${chunk.articulo} (Parte ${part})` : null,
        seccion: chunk.seccion ? `${chunk.seccion} (Parte ${part})` : null,
      });
      start = end;
      part += 1;
    }
  }
  return result;
}

export function deduplicateChunks(chunks: ChunkMetadata[]): ChunkMetadata[] {
  const seen = new Set<string>();
  const unique: ChunkMetadata[] = [];
  for (const chunk of chunks) {
    const sig = createHash("sha256")
      .update([chunk.articulo ?? "", chunk.seccion ?? "", normalizeForDedup(chunk.contenido)].join("::"))
      .digest("hex");
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(chunk);
  }
  return unique;
}

export function buildChunks(rawText: string): ChunkMetadata[] {
  const text = cleanText(rawText);
  const articleChunks = chunkByArticles(text);
  const raw = articleChunks.length >= 2 ? articleChunks : chunkBySections(text);
  return deduplicateChunks(enforceMaxChunkSize(raw));
}

export function inferTipo(filename: string, text: string): TipoNorma {
  const s = `${filename}\n${text}`.toLowerCase();
  if (s.includes("ordenanza")) return "ordenanza";
  if (s.includes("decreto")) return "decreto";
  if (s.includes("reglamento")) return "reglamento";
  if (s.includes("resoluci")) return "resolucion";
  if (s.includes("ley")) return "ley";
  return "otro";
}

export function inferNumero(filename: string, text: string): string {
  return `${filename}\n${text}`.match(/\b(\d{1,5}(?:[-/]\d{2,4})?)\b/)?.[1] ?? "s/n";
}
