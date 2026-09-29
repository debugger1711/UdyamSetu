export type UserRole = "applicant" | "officer" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  mobile?: string;
  role: UserRole;
  designation?: string;
  department?: string;
  enterpriseName?: string;
  panNumber?: string;
  gstin?: string;
  udyamNumber?: string;
  createdAt: string;
  updatedAt: string;
}
