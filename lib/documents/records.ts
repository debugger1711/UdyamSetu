import "server-only";

import { getOwnedApplication, listOwnedApplications } from "@/lib/applications/queries";
import { requireUser } from "@/lib/auth/session";
import {
  DOCUMENT_BUCKET,
  documentStoragePath,
  isDocumentCategory,
  validateDocumentUpload,
} from "@/lib/documents/validate-upload";
import { createClient } from "@/lib/supabase/server";

export type StoredDocument = {
  id: string;
  application_id: string;
  application_approval_id: string | null;
  name: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: string;
  category: string;
  authority: string | null;
  analysis: unknown;
  uploaded_at: string;
};

const DOCUMENT_COLUMNS =
  "id, application_id, application_approval_id, name, file_name, storage_path, mime_type, file_size, status, category, authority, analysis, uploaded_at";

export async function listOwnedDocuments(applicationId: string): Promise<
  | { ok: true; data: StoredDocument[] | null }
  | { ok: false; reason: "unavailable" }
> {
  const application = await getOwnedApplication(applicationId);
  if (!application.ok) return { ok: false, reason: "unavailable" };
  if (!application.data) return { ok: true, data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: false });

  if (error) return { ok: false, reason: "unavailable" };
  return { ok: true, data: (data ?? []) as StoredDocument[] };
}

export async function getOwnedDocument(documentId: string): Promise<
  | { ok: true; data: StoredDocument | null }
  | { ok: false; reason: "unavailable" }
> {
  await requireUser();
  const applications = await listOwnedApplications();
  if (!applications.ok) return { ok: false, reason: "unavailable" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", documentId)
    .maybeSingle();

  if (error) return { ok: false, reason: "unavailable" };
  const row = (data as StoredDocument | null) ?? null;
  if (!row || !applications.data.some((application) => application.id === row.application_id)) {
    return { ok: true, data: null };
  }
  return { ok: true, data: row };
}

export type UploadDocumentResult =
  | { status: 201; document: StoredDocument }
  | { status: 400; reason: string }
  | { status: 404 }
  | { status: 503 };

export async function uploadOwnedDocument(input: {
  applicationId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  name: string;
  category: string;
  authority: string;
  applicationApprovalId: string | null;
}): Promise<UploadDocumentResult> {
  const checked = validateDocumentUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  if (!checked.ok) return { status: 400, reason: checked.reason };
  if (!input.name.trim() || !isDocumentCategory(input.category)) {
    return { status: 400, reason: "metadata" };
  }

  const application = await getOwnedApplication(input.applicationId);
  if (!application.ok) return { status: 503 };
  if (!application.data) return { status: 404 };

  const supabase = await createClient();
  if (input.applicationApprovalId) {
    const { data: approval, error } = await supabase
      .from("application_approvals")
      .select("id, application_id")
      .eq("id", input.applicationApprovalId)
      .maybeSingle();
    if (error) return { status: 503 };
    if (!approval || approval.application_id !== input.applicationId) return { status: 404 };
  }

  const documentId = crypto.randomUUID();
  const storagePath = documentStoragePath(input.applicationId, documentId, checked.safeFileName);
  const uploaded = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, input.bytes, {
    contentType: checked.kind.mimeType,
    upsert: false,
  });
  if (uploaded.error) return { status: 503 };

  const registered = await supabase.rpc("register_uploaded_document", {
    target_application: input.applicationId,
    target_document: documentId,
    target_approval: input.applicationApprovalId,
    document_name: input.name.trim(),
    safe_file_name: checked.safeFileName,
    document_mime: checked.kind.mimeType,
    document_size: input.bytes.byteLength,
    document_category: input.category,
    document_authority: input.authority.trim(),
  });

  if (registered.error) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    const message = registered.error.message ?? "";
    if (message.includes("approval does not belong")) return { status: 404 };
    if (message.includes("unsafe filename")) return { status: 400, reason: "filename" };
    return { status: 503 };
  }

  const loaded = await getOwnedDocument(documentId);
  if (!loaded.ok || !loaded.data) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    return { status: 503 };
  }
  return { status: 201, document: loaded.data };
}
