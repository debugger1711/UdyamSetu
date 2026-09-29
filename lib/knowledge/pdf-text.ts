import { extractText } from "unpdf";

/** Reads text already stored in the PDF. Image-only pages are left empty. */
export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const result = await extractText(bytes, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text];
  const text = pages
    .map((page) => page.replace(/\u0000/g, "").trim())
    .filter((page) => page.length > 0)
    .join("\n\n");
  return { text, pageCount: result.totalPages };
}
