import { displayFileSize } from "./validate-upload";

export type VaultDocument = {
  id: string;
  name: string;
  fileName: string;
  file: string;
  category: string;
  type: string;
  size: string;
  status: "Uploaded";
  processingStatus: "uploaded";
  validationStatus: "pending";
  documentType: string | null;
  uploadDate: string;
  uploadedAt: string;
  authority: string;
  notes: string;
  applicationId: string;
  approvalId: string | null;
  extractedData: {
    enterpriseName: string | null;
    projectName: string | null;
    investmentAmount: string | null;
    location: string | null;
    proposedCapacity: string | null;
    registrationNumber: string | null;
    documentType: string | null;
    issuingAuthority: string | null;
  } | null;
};

type DocumentRow = {
  id: string;
  application_id: string;
  application_approval_id: string | null;
  name: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: string;
  category: string;
  authority: string | null;
  analysis: unknown;
  uploaded_at: string;
};

function analysisField(analysis: unknown, key: string): string | null {
  if (!analysis || typeof analysis !== "object") return null;
  const value = (analysis as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function toVaultDocument(row: DocumentRow): VaultDocument {
  const extension = row.file_name.split(".").pop()?.toUpperCase() || "FILE";
  const uploaded = new Date(row.uploaded_at);
  const uploadDate = Number.isNaN(uploaded.valueOf())
    ? row.uploaded_at
    : uploaded.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    file: row.file_name,
    category: row.category,
    type: extension,
    size: displayFileSize(Number(row.file_size)),
    status: "Uploaded",
    processingStatus: "uploaded",
    validationStatus: "pending",
    documentType: analysisField(row.analysis, "documentType"),
    uploadDate,
    uploadedAt: row.uploaded_at,
    authority: row.authority || "Not recorded",
    notes: "Stored for this application. Not verified and not accepted by a department.",
    applicationId: row.application_id,
    approvalId: row.application_approval_id,
    extractedData: row.analysis
      ? {
          enterpriseName: analysisField(row.analysis, "enterpriseName"),
          projectName: analysisField(row.analysis, "projectName"),
          investmentAmount: analysisField(row.analysis, "investmentAmount"),
          location: analysisField(row.analysis, "location"),
          proposedCapacity: analysisField(row.analysis, "proposedCapacity"),
          registrationNumber: analysisField(row.analysis, "registrationNumber"),
          documentType: analysisField(row.analysis, "documentType"),
          issuingAuthority: analysisField(row.analysis, "issuingAuthority"),
        }
      : null,
  };
}
