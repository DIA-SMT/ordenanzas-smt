declare module "pdf-parse" {
  interface PdfParseResult {
    text?: string;
    numpages?: number;
    info?: unknown;
  }
  function pdf(buffer: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdf;
}
