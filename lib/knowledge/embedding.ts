/** Gemini text-embedding-004 returns 768 values. Other lengths are rejected. */
export const EMBEDDING_DIMENSION = 768;

export function normalizeEmbedding(values: unknown): number[] | null {
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSION) return null;
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  return values;
}

export function embeddingLiteral(values: number[]): string | null {
  const normalized = normalizeEmbedding(values);
  if (!normalized) return null;
  return `[${normalized.join(",")}]`;
}
