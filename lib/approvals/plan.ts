import { CORE_APPROVAL_DEPENDENCY_GRAPH } from "../rules/dependency-rules";
import {
  determineRequiredApprovals,
  INSUFFICIENT_PROJECT_INFORMATION,
  type ApprovalEngineInput,
} from "../rules/approval-rules";
import { APPROVAL_CATALOG, catalogEntry } from "./catalog";

export const UNKNOWN_APPROVAL_CODE = "UNKNOWN_APPROVAL_CODE" as const;

export type PlannedApproval = {
  code: string;
  approvalTypeId: string;
  sortOrder: number;
  status: "pending";
  required: true;
};

export type PlanResult =
  | { ok: true; planned: PlannedApproval[] }
  | {
      ok: false;
      code: typeof INSUFFICIENT_PROJECT_INFORMATION;
      missing: Array<"landClassification" | "pollutionCategory">;
    }
  | { ok: false; code: typeof UNKNOWN_APPROVAL_CODE; unknown: string[] };

export function planApplicationApprovals(
  input: ApprovalEngineInput,
  catalog: readonly { id: string; code: string }[] = APPROVAL_CATALOG.map((entry, index) => ({
    id: entry.code,
    code: entry.code,
    index,
  })),
): PlanResult {
  const decision = determineRequiredApprovals(input);
  if (!decision.ok) {
    return decision;
  }

  const unknown = decision.codes.filter((code) => !catalog.some((entry) => entry.code === code) || !catalogEntry(code));
  if (unknown.length > 0) {
    return { ok: false, code: UNKNOWN_APPROVAL_CODE, unknown };
  }

  return {
    ok: true,
    planned: decision.codes.map((code, index) => ({
      code,
      approvalTypeId: catalog.find((entry) => entry.code === code)!.id,
      sortOrder: index + 1,
      status: "pending" as const,
      required: true as const,
    })),
  };
}

/** Rows already stored for an approval type are not planned again. */
export function newApprovalPlans(
  planned: readonly PlannedApproval[],
  existingTypeIds: readonly string[],
): PlannedApproval[] {
  const existing = new Set(existingTypeIds);
  return planned.filter((item) => !existing.has(item.approvalTypeId));
}

export function approvalVisibleTo(
  approval: { application_id: string } | null,
  ownedApplicationIds: readonly string[],
): boolean {
  return approval !== null && ownedApplicationIds.includes(approval.application_id);
}

export function dependencyLinks(codes: readonly string[]): Map<string, { dependencyCodes: string[]; canRunParallel: boolean }> {
  const present = new Set(codes);
  const links = new Map<string, { dependencyCodes: string[]; canRunParallel: boolean }>();
  for (const code of codes) {
    links.set(code, { dependencyCodes: [], canRunParallel: false });
  }

  for (const edge of CORE_APPROVAL_DEPENDENCY_GRAPH) {
    if (!present.has(edge.fromApprovalCode) || !present.has(edge.toApprovalCode)) {
      continue;
    }
    if (edge.dependencyType === "hard_prerequisite") {
      links.get(edge.toApprovalCode)?.dependencyCodes.push(edge.fromApprovalCode);
    }
    if (edge.dependencyType === "parallel_allowed") {
      const target = links.get(edge.toApprovalCode);
      const source = links.get(edge.fromApprovalCode);
      if (target) target.canRunParallel = true;
      if (source) source.canRunParallel = true;
    }
  }

  return links;
}
