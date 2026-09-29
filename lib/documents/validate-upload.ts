export const DOCUMENT_BUCKET = "application-documents";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_CATEGORIES = [
  "Environmental",
  "Entity Identity",
  "Land & Site",
  "Civil Architecture",
  "Engineering",
  "Safety & Fire",
  "Financial & Technical",
  "Labour & Welfare",
  "General Compliance",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

const PDF = "application/pdf";
const DOC = "application/msword";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AllowedDocumentKind = {
  extension: "pdf" | "doc" | "docx";
  mimeType: string;
};

export type UploadValidationResult =
  | { ok: true; kind: AllowedDocumentKind; safeFileName: string }
  | { ok: false; reason: "empty" | "too_large" | "mime" | "extension" | "filename" | "content" };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function kindForExtension(extension: string): AllowedDocumentKind | null {
  if (extension === "pdf") return { extension: "pdf", mimeType: PDF };
  if (extension === "doc") return { extension: "doc", mimeType: DOC };
  if (extension === "docx") return { extension: "docx", mimeType: DOCX };
  return null;
}

function contentMatches(kind: AllowedDocumentKind, bytes: Uint8Array): boolean {
  if (kind.extension === "pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  if (kind.extension === "docx") return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
}

/** The stored name is a single safe segment. The caller never supplies the storage path. */
export function sanitizeFileName(fileName: string): string | null {
  if (!fileName || fileName.length > 180) return null;
  if (fileName.includes("\0") || fileName.includes("..") || /[/\\]/.test(fileName)) return null;
  const trimmed = fileName.trim();
  const cleaned = trimmed.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120);
  if (!cleaned || cleaned === "." || cleaned === "..") return null;
  return cleaned;
}

export function documentStoragePath(applicationId: string, documentId: string, safeFileName: string): string {
  return `application/${applicationId}/documents/${documentId}/${safeFileName}`;
}

export function validateDocumentUpload(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): UploadValidationResult {
  if (input.bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (input.bytes.byteLength > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too_large" };

  const safeFileName = sanitizeFileName(input.fileName);
  if (!safeFileName) return { ok: false, reason: "filename" };

  const extension = safeFileName.split(".").pop()?.toLowerCase() ?? "";
  const kind = kindForExtension(extension);
  if (!kind) return { ok: false, reason: "extension" };

  const declared = input.mimeType.trim().toLowerCase();
  if (declared && declared !== kind.mimeType && declared !== "application/octet-stream") {
    return { ok: false, reason: "mime" };
  }

  if (!contentMatches(kind, input.bytes)) return { ok: false, reason: "content" };
  return { ok: true, kind, safeFileName };
}

export function displayFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function isDocumentCategory(value: string): value is DocumentCategory {
  return DOCUMENT_CATEGORIES.some((item) => item === value);
}
