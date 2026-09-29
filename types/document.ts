export type DocumentValidationStatus =
  | "pending"
  | "pre_validated"
  | "defect_detected"
  | "officer_verified"
  | "rejected";

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  category: "identity" | "land" | "technical" | "environmental" | "financial" | "noc";
  maxSizeMb: number;
  allowedFormats: string[];
  isMandatory: boolean;
  sampleTemplateUrl?: string;
}

export interface UploadedDocument {
  id: string;
  applicationId?: string;
  projectId: string;
  documentTypeId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storagePath: string;
  validationStatus: DocumentValidationStatus;
  aiValidationFeedback?: string;
  uploadedAt: string;
}
