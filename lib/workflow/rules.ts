export const APPLICATION_WORKFLOW_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "query_raised",
  "query_response_submitted",
] as const;

export type ApplicationWorkflowStatus = (typeof APPLICATION_WORKFLOW_STATUSES)[number];

export type SubmissionDecision =
  | "submit"
  | "not_found"
  | "not_draft"
  | "checklist_missing"
  | "department_missing";

/**
 * Mirrors submit_application. Department count is the number of approval
 * instances whose catalog department matches a department row.
 */
export function submissionDecision(input: {
  owned: boolean;
  status: string;
  approvalCount: number;
  departmentApprovalCount: number;
}): SubmissionDecision {
  if (!input.owned) return "not_found";
  if (input.status !== "draft") return "not_draft";
  if (input.approvalCount < 1) return "checklist_missing";
  if (input.departmentApprovalCount < 1) return "department_missing";
  return "submit";
}

export function applicationStatusAfterQuery(): "query_raised" {
  return "query_raised";
}

export function applicationStatusAfterResponse(
  openQueriesRemaining: number,
): "query_raised" | "query_response_submitted" {
  return openQueriesRemaining > 0 ? "query_raised" : "query_response_submitted";
}

export function queryText(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 4000) return null;
  return trimmed;
}
