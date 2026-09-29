import { createHash } from "node:crypto";

import { chunkText, MAX_CHUNKS } from "@/lib/knowledge/chunk";
import { embeddingLiteral } from "@/lib/knowledge/embedding";
import { embedText } from "@/lib/knowledge/model";
import {
  isOfficialPolicyUrl,
  observedLanguage,
  OFFICIAL_POLICY_PAGE,
  parsePolicyListing,
  PRIMARY_POLICY_TITLE,
  validatePolicyText,
  type PolicyListing,
  type PolicyRegistry,
} from "@/lib/knowledge/official-source";
import { extractPdfText } from "@/lib/knowledge/pdf-text";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export type PolicyIngestResult = {
  title: string;
  year: number | null;
  documentUrl: string | null;
  language: "Marathi" | "English" | "not recorded" | null;
  status: "ready" | "already_stored" | "unavailable";
  reason: string | null;
  documentId: string | null;
  chunks: number | null;
  embeddings: boolean;
};

async function fetchOfficial(url: string, redirectsLeft = 2): Promise<Uint8Array | string> {
  if (!isOfficialPolicyUrl(url)) return "The source is not an official policy URL.";
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(45_000) });
  if (response.status >= 300 && response.status < 400) {
    if (redirectsLeft === 0) return "The official source redirected too many times.";
    const location = response.headers.get("location");
    if (!location) return "The official source redirect had no destination.";
    return fetchOfficial(new URL(location, url).toString(), redirectsLeft - 1);
  }
  if (!response.ok) return "The official source could not be downloaded.";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
    return "The official file was empty or larger than the retrieval limit.";
  }
  return bytes;
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function sourceLabel(registry: PolicyRegistry): string {
  const parts = [registry.authority, registry.department].filter((part): part is string => Boolean(part));
  const label = parts.join(". ");
  return label.slice(0, 200);
}

type KnowledgeStore = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

async function storePolicy(
  supabase: KnowledgeStore,
  registry: PolicyRegistry,
  policy: PolicyListing,
  text: string,
  pageCount: number,
  retrievedAt: string,
): Promise<PolicyIngestResult> {
  const language = observedLanguage(text);
  const base = {
    title: policy.title,
    year: policy.year,
    documentUrl: policy.documentUrl,
    language,
    documentId: null,
    chunks: null,
    embeddings: false,
  };
  if (policy.title.length > 200) {
    return { ...base, status: "unavailable", reason: "The official title is longer than the stored title field." };
  }
  let chunks: string[];
  try {
    chunks = chunkText(text);
  } catch {
    return { ...base, status: "unavailable", reason: `The extracted text exceeds ${MAX_CHUNKS} chunks and was not truncated.` };
  }
  if (chunks.length === 0) {
    return { ...base, status: "unavailable", reason: "The official file did not yield readable text. OCR is not available." };
  }

  const rows = [];
  let embeddings = false;
  for (const content of chunks) {
    const embedded = await embedText(content);
    if (embedded) embeddings = true;
    rows.push({ content, embedding: embedded ? embeddingLiteral(embedded) : null });
  }

  const result = await supabase.rpc("ingest_knowledge_document", {
    document_title: policy.title,
    document_source: sourceLabel(registry) || "Government of Maharashtra",
    document_uri: policy.documentUrl,
    document_hash: createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex"),
    chunk_rows: rows,
    document_metadata: {
      authority: registry.authority,
      department: registry.department,
      source_category: "policy",
      policy_year: policy.year,
      official_page_url: OFFICIAL_POLICY_PAGE,
      official_document_url: policy.documentUrl,
      language,
      source_type: "official_government_policy",
      retrieved_at: retrievedAt,
      page_count: pageCount,
    },
  });
  if (result.error) {
    const message = result.error.message ?? "";
    if (message.includes("already stored")) {
      return { ...base, status: "already_stored", reason: null, chunks: chunks.length, embeddings };
    }
    return { ...base, status: "unavailable", reason: "The source could not be stored." };
  }
  return {
    ...base,
    status: "ready",
    reason: null,
    documentId: String(result.data),
    chunks: chunks.length,
    embeddings,
  };
}

async function ingestOne(
  supabase: KnowledgeStore,
  registry: PolicyRegistry,
  policy: PolicyListing,
  retrievedAt: string,
): Promise<PolicyIngestResult> {
  const base = {
    title: policy.title,
    year: policy.year,
    documentUrl: policy.documentUrl,
    language: null,
    documentId: null,
    chunks: null,
    embeddings: false,
  };
  const downloaded = await fetchOfficial(policy.documentUrl);
  if (typeof downloaded === "string") {
    return { ...base, status: "unavailable", reason: downloaded };
  }
  if (!isPdf(downloaded)) {
    return { ...base, status: "unavailable", reason: "The official link did not return a PDF." };
  }
  let extracted: { text: string; pageCount: number };
  try {
    extracted = await extractPdfText(downloaded);
  } catch {
    return { ...base, status: "unavailable", reason: "The official PDF could not be read." };
  }
  const validation = validatePolicyText(extracted.text, extracted.pageCount);
  if (!validation.ok) {
    return { ...base, language: observedLanguage(extracted.text), status: "unavailable", reason: validation.reason };
  }
  const prefixed = [
    `Official policy listing. Title: ${policy.title}.`,
    policy.year ? `Year: ${policy.year}.` : null,
    "Category: policy.",
    `Source page: ${OFFICIAL_POLICY_PAGE}`,
    `Document: ${policy.documentUrl}`,
    extracted.text,
  ].filter((line): line is string => Boolean(line)).join("\n");
  return storePolicy(supabase, registry, policy, prefixed, extracted.pageCount, retrievedAt);
}

export async function discoverOfficialPolicies(): Promise<PolicyRegistry | { error: string }> {
  const downloaded = await fetchOfficial(OFFICIAL_POLICY_PAGE);
  if (typeof downloaded === "string") return { error: downloaded };
  const html = new TextDecoder().decode(downloaded);
  const registry = parsePolicyListing(html);
  if (registry.policies.length === 0) return { error: "The official policy page listed no PDF attachments." };
  return registry;
}

export async function ingestOfficialPolicies(
  supabase: KnowledgeStore,
  scope: "primary" | "all",
): Promise<{ registry: PolicyRegistry; results: PolicyIngestResult[] } | { error: string }> {
  const discovered = await discoverOfficialPolicies();
  if ("error" in discovered) return discovered;
  const selected = scope === "primary"
    ? discovered.policies.filter((policy) => policy.title === PRIMARY_POLICY_TITLE)
    : discovered.policies;
  if (selected.length === 0) {
    return {
      registry: discovered,
      results: [{
        title: PRIMARY_POLICY_TITLE,
        year: null,
        documentUrl: null,
        language: null,
        status: "unavailable",
        reason: "The official policy page did not list this document.",
        documentId: null,
        chunks: null,
        embeddings: false,
      }],
    };
  }
  const retrievedAt = new Date().toISOString();
  const results: PolicyIngestResult[] = [];
  for (const policy of selected) {
    results.push(await ingestOne(supabase, discovered, policy, retrievedAt));
  }
  return { registry: discovered, results };
}
