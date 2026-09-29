const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "do",
  "does",
  "for",
  "how",
  "in",
  "is",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
]);

/** Drops English function words so a natural question can match an official title. */
export function lexicalQuery(query: string): string {
  const words = query
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !STOPWORDS.has(word.toLowerCase()));
  return words.join(" ") || query.trim();
}
