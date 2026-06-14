import { cleanText } from "./processNormativa";

/** Extrae texto de un PDF/DOCX/TXT. Para PDF escaneado sin texto, avisa. */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType.includes("pdf")) {
    const pdf = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text?: string }>;
    const parsed = await pdf(buffer);
    const text = cleanText(parsed.text ?? "");
    if (text.length < 200) {
      throw new Error(
        "El PDF parece escaneado (sin texto digital). Subí una versión con texto o un PDF ya OCRizado.",
      );
    }
    return text;
  }
  if (mimeType.includes("wordprocessingml.document") || mimeType.includes("msword")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return cleanText(parsed.value ?? "");
  }
  if (mimeType.startsWith("text/")) {
    return cleanText(buffer.toString("utf-8"));
  }
  throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
}
