import { LAND_CLASSIFICATIONS, POLLUTION_CATEGORIES } from "../../types/project";
import type { LandClassification, PollutionCategory } from "../../types/project";

/**
 * The current rule reads only these two project inputs.
 * Sector, investment, stage, and location are not inputs.
 */
export type ApprovalEngineInput = {
  pollutionCategory: string | null;
  landClassification: string | null;
};

export const INSUFFICIENT_PROJECT_INFORMATION = "INSUFFICIENT_PROJECT_INFORMATION" as const;

export type ApprovalEngineSuccess = {
  ok: true;
  codes: string[];
};

export type ApprovalEngineFailure = {
  ok: false;
  code: typeof INSUFFICIENT_PROJECT_INFORMATION;
  missing: Array<"landClassification" | "pollutionCategory">;
};

export type ApprovalEngineResult = ApprovalEngineSuccess | ApprovalEngineFailure;

function isLandClassification(value: string | null): value is LandClassification {
  return LAND_CLASSIFICATIONS.some((item) => item === value);
}

function isPollutionCategory(value: string | null): value is PollutionCategory {
  return POLLUTION_CATEGORIES.some((item) => item === value);
}

/**
 * Returns the approval codes required by the existing project rule.
 * A missing land classification is not treated as an industrial estate,
 * and it is not treated as private land.
 */
export function determineRequiredApprovals(input: ApprovalEngineInput): ApprovalEngineResult {
  const missing: ApprovalEngineFailure["missing"] = [];
  if (!isLandClassification(input.landClassification)) {
    missing.push("landClassification");
  }
  if (!isPollutionCategory(input.pollutionCategory)) {
    missing.push("pollutionCategory");
  }
  if (missing.length > 0) {
    return { ok: false, code: INSUFFICIENT_PROJECT_INFORMATION, missing };
  }

  const landClassification = input.landClassification as LandClassification;
  const pollutionCategory = input.pollutionCategory as PollutionCategory;
  const approvalCodes: string[] = [];

  if (landClassification === "industrial_estate") {
    approvalCodes.push("MIDC_LAND_ALLOTMENT");
  } else {
    approvalCodes.push("NA_LAND_CONVERSION");
  }

  if (pollutionCategory === "red" || pollutionCategory === "orange") {
    approvalCodes.push("PCB_CTE");
    approvalCodes.push("PCB_CTO");
  } else if (pollutionCategory === "green") {
    approvalCodes.push("PCB_GREEN_CONSENT");
  }

  approvalCodes.push("FIRE_NOC");
  approvalCodes.push("FACTORY_PLAN_DISH");
  approvalCodes.push("POWER_FEASIBILITY");

  return { ok: true, codes: approvalCodes };
}
