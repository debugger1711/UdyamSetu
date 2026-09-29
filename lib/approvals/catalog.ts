/**
 * Reference data for the approval codes determineRequiredApprovals can return.
 * Pollution-board codes use the MPCB department already stored for PCB_CTE.
 */
export type ApprovalCatalogEntry = {
  code: string;
  name: string;
  department: string | null;
  description: string;
  category: "Land & Building" | "Environment & Pollution" | "Safety & Fire" | "Utilities & Power";
};

export const APPROVAL_CATALOG: readonly ApprovalCatalogEntry[] = [
  {
    code: "MIDC_LAND_ALLOTMENT",
    name: "MIDC Land Allotment & Lease Possession",
    department: "MIDC",
    description: "Statutory land allotment and possession order for industrial plots.",
    category: "Land & Building",
  },
  {
    code: "NA_LAND_CONVERSION",
    name: "NA_LAND_CONVERSION",
    department: null,
    description: "Required by the existing approval rule when land is not an industrial estate.",
    category: "Land & Building",
  },
  {
    code: "PCB_CTE",
    name: "Consent to Establish (CTE)",
    department: "MPCB",
    description: "Statutory environmental clearance prior to construction of industrial facility.",
    category: "Environment & Pollution",
  },
  {
    code: "PCB_CTO",
    name: "PCB_CTO",
    department: "MPCB",
    description: "Required by the existing approval rule for red and orange pollution categories.",
    category: "Environment & Pollution",
  },
  {
    code: "PCB_GREEN_CONSENT",
    name: "PCB_GREEN_CONSENT",
    department: "MPCB",
    description: "Required by the existing approval rule for the green pollution category.",
    category: "Environment & Pollution",
  },
  {
    code: "FIRE_NOC",
    name: "Provisional Fire Safety NOC",
    department: "FIRE_SERVICES",
    description: "Fire protection system design approval and egress plan clearance.",
    category: "Safety & Fire",
  },
  {
    code: "FACTORY_PLAN_DISH",
    name: "Factory Building Plan Approval",
    department: "DISH",
    description: "Factory safety, worker welfare amenities, ventilation, and machinery layout approval.",
    category: "Safety & Fire",
  },
  {
    code: "POWER_FEASIBILITY",
    name: "POWER_FEASIBILITY",
    department: null,
    description: "Required by the existing approval rule for every project with complete approval inputs.",
    category: "Utilities & Power",
  },
];

export const APPROVAL_CODES = APPROVAL_CATALOG.map((entry) => entry.code);

export function catalogEntry(code: string): ApprovalCatalogEntry | null {
  return APPROVAL_CATALOG.find((entry) => entry.code === code) ?? null;
}
