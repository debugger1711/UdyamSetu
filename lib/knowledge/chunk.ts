/**
 * Plain-text chunking for regulatory sources.
 * Size and overlap are technical limits, not a legal rule.
 */

export const DEFAULT_CHUNK_SIZE = 1200;
export const DEFAULT_CHUNK_OVERLAP = 200;
export const MAX_CHUNKS = 800;

export function chunkText(
  input: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (size < 200 || overlap < 0 || overlap >= size) {
    throw new Error("invalid chunk size");
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
    if (chunks.length > MAX_CHUNKS) {
      throw new Error("invalid chunk size");
    }
  }
  return chunks;
}
