export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "rescheduled"
  | "compliance_pending";

export interface InspectionOfficer {
  officerId: string;
  name: string;
  department: string;
  designation: string;
}

export interface JointInspection {
  id: string;
  projectId: string;
  applicationIds: string[];
  scheduledDate: string;
  timeSlot: string;
  status: InspectionStatus;
  leadDepartment: string;
  participatingOfficers: InspectionOfficer[];
  siteAddress: string;
  reportSummary?: string;
  isCompliant?: boolean;
  createdAt: string;
  updatedAt: string;
}
