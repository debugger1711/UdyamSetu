import { dependencyLinks } from "./plan";

export interface StructuredApproval {
  id: string;
  code: string;
  name: string;
  authority: string;
  authorityFullName: string;
  category: "Land & Building" | "Environment & Pollution" | "Safety & Fire" | "Utilities & Power" | "Labour & Welfare" | "Operational";
  status: "Completed" | "In Progress" | "Ready to Apply" | "Pending";
  estimatedDays: number;
  slaDays: number;
  documentsRequired: number;
  documentsReady: number;
  dependencies: string[];
  canRunParallel: boolean;
  parallelWith?: string[];
  riskLevel: "Low" | "Medium" | "High";
  description: string;
  nextAction: string;
  feeEstimatedInr: number;
  applicationUrl?: string;
  whyItApplies: string;
}

export type StoredApproval = {
  id: string;
  applicationId: string;
  status: string;
  sortOrder: number;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
  category: StructuredApproval["category"];
};

const DISPLAY_STATUS: Record<string, StructuredApproval["status"]> = {
  pending: "Pending",
};

export function toChecklist(rows: readonly StoredApproval[]): StructuredApproval[] {
  const ordered = [...rows].sort((left, right) => left.sortOrder - right.sortOrder);
  const links = dependencyLinks(ordered.map((row) => row.code));
  const idByCode = new Map(ordered.map((row) => [row.code, row.id]));

  return ordered.map((row) => {
    const link = links.get(row.code);
    const status = DISPLAY_STATUS[row.status];
    if (!status) {
      throw new Error(`Unsupported approval status: ${row.status}`);
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      authority: row.department ?? "Not recorded",
      authorityFullName: row.department ?? "Not recorded",
      category: row.category,
      status,
      estimatedDays: 0,
      slaDays: 0,
      documentsRequired: 0,
      documentsReady: 0,
      dependencies: (link?.dependencyCodes ?? []).flatMap((code) => {
        const id = idByCode.get(code);
        return id ? [id] : [];
      }),
      canRunParallel: link?.canRunParallel ?? false,
      riskLevel: "Low",
      description: row.description ?? "",
      nextAction: "Required approval recorded. Department submission has not started.",
      feeEstimatedInr: 0,
      whyItApplies: row.description ?? "",
    };
  });
}
