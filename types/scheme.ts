export type SchemeCategory =
  | "capital_subsidy"
  | "interest_subvention"
  | "stamp_duty_exemption"
  | "electricity_duty_concession"
  | "green_industrial_incentive"
  | "export_promotion";

export interface GovernmentScheme {
  id: string;
  name: string;
  code: string;
  level: "central" | "state";
  state?: string;
  ministryDepartment: string;
  category: SchemeCategory;
  description: string;
  benefitsSummary: string;
  maxIncentiveAmountInr?: number;
  eligibilityConditions: string[];
  requiredSectors: string[];
  portalUrl?: string;
  isActive: boolean;
}
