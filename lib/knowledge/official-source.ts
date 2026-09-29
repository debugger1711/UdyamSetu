/**
 * Official Maharashtra policy listing rules.
 * A URL is accepted only when it is the policies page or a PDF linked from it.
 */

export const OFFICIAL_POLICY_PAGE = "https://industry.maharashtra.gov.in/en/services/policies";
export const OFFICIAL_POLICY_HOST = "industry.maharashtra.gov.in";
export const PRIMARY_POLICY_TITLE = "Maharashtra Industries, Investment & Services Policy 2025";

export type PolicyListing = {
  title: string;
  year: number | null;
  documentUrl: string;
};

export type PolicyRegistry = {
  authority: string | null;
  department: string | null;
  policies: PolicyListing[];
};

export function isOfficialPolicyUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password || url.port) return false;
  if (url.hostname !== OFFICIAL_POLICY_HOST) return false;
  if (url.pathname.includes("..") || url.pathname.includes("\\")) return false;
  if (url.pathname === "/en/services/policies") return true;
  return url.pathname.startsWith("/sites/default/files/") && url.pathname.toLowerCase().endsWith(".pdf");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cellText(row: string, className: string): string {
  const match = row.match(new RegExp(`views-field-${className}"[^>]*>([\\s\\S]*?)</td>`, "i"));
  if (!match) return "";
  return decodeHtml(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parsePolicyListing(html: string): PolicyRegistry {
  const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? "";
  const decodedDescription = decodeHtml(description);
  const department = decodedDescription.match(/Department of .+?(?=, Government of Maharashtra|$)/)?.[0] ?? null;
  const authority = decodedDescription.includes("Government of Maharashtra") ? "Government of Maharashtra" : null;
  const policies: PolicyListing[] = [];

  for (const row of html.split(/<tr\b/i).slice(1)) {
    const title = cellText(row, "title");
    const yearText = cellText(row, "field-year");
    const href = row.match(/href="([^"]+\.pdf)"/i)?.[1];
    if (!title || !href) continue;
    const documentUrl = new URL(decodeHtml(href), OFFICIAL_POLICY_PAGE).toString();
    if (!isOfficialPolicyUrl(documentUrl)) continue;
    policies.push({
      title,
      year: /^\d{4}$/.test(yearText) ? Number(yearText) : null,
      documentUrl,
    });
  }

  return { authority, department, policies };
}

export function observedLanguage(text: string): "Marathi" | "English" | "not recorded" {
  const devanagari = text.match(/\p{Script=Devanagari}/gu)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  if (devanagari >= 1000 && devanagari >= latin * 0.4) return "Marathi";
  if (latin >= 1000 && devanagari < 1000) return "English";
  return "not recorded";
}

export function validatePolicyText(text: string, pageCount: number): { ok: true } | { ok: false; reason: string } {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const letters = cleaned.match(/[\p{L}]/gu)?.length ?? 0;
  if (pageCount < 1 || cleaned.length < 1500 || letters / Math.max(cleaned.length, 1) < 0.25) {
    return { ok: false, reason: "The official file did not yield readable text. OCR is not available." };
  }
  const broken = cleaned.match(/\uFFFD/g)?.length ?? 0;
  if (broken / cleaned.length > 0.02) {
    return { ok: false, reason: "The extracted text is corrupted." };
  }
  const sample = cleaned.slice(Math.floor(cleaned.length / 3), Math.floor(cleaned.length / 3) + 240);
  if (sample.length >= 120 && cleaned.split(sample).length - 1 > 4) {
    return { ok: false, reason: "The extracted text repeats the same passage." };
  }
  return { ok: true };
}
