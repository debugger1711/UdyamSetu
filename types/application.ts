export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_scrutiny"
  | "query_raised"
  | "query_responded"
  | "inspection_scheduled"
  | "inspection_completed"
  | "approved"
  | "rejected";

export interface Application {
  id: string;
  projectId: string;
  approvalId: string;
  approvalName: string;
  authority: string;
  applicationNumber: string;
  status: ApplicationStatus;
  submittedAt?: string;
  slaDeadline?: string;
  assignedOfficerName?: string;
  assignedOfficerDesignation?: string;
  certificateUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}
