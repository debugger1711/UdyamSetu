export type ApprovalAuthority =
  | "MPCB"
  | "CPCB"
  | "MIDC"
  | "DISH"
  | "FIRE_SERVICES"
  | "DISCOM"
  | "REVENUE_DEPT"
  | "CGWA"
  | "PESO"
  | "FOREST_DEPT"
  | "MUNICIPAL_CORP";

export type ClearanceStage = "pre_establishment" | "pre_operation" | "post_operation";

export interface Approval {
  id: string;
  code: string;
  name: string;
  authority: ApprovalAuthority;
  authorityFullName: string;
  stage: ClearanceStage;
  description: string;
  legalAct: string;
  statutorySlaDays: number;
  feeEstimatedInr?: number;
  mandatoryDocuments: string[];
  prerequisiteApprovalIds: string[];
  departmentPortalUrl?: string;
  validityYears?: number;
}
