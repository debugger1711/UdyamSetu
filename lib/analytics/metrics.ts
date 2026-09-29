/**
 * Turns scoped database counts into the existing analytics cards.
 * Rates stay "Not recorded" when the denominator or the SLA clock does not exist.
 * The 72-hour due-soon window comes from the shared SLA helper and is not statutory.
 */

import { slaState } from "../sla/state";

const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export type AnalyticsTimeframe = "monthly" | "q3-2025" | "ytd";

export type AnalyticsScope = "own" | "department" | "system";

export type StatusCount = Record<string, number>;

export type WorkflowFact = {
  department: string;
  slaStartedAt: string | null;
  slaDeadline: string | null;
  slaCompletedAt: string | null;
};

export type AnalyticsFacts = {
  scope: AnalyticsScope;
  projects: number;
  applications: number;
  applicationStatuses: StatusCount;
  approvalsPending: number;
  approvalStatuses: StatusCount;
  documentsUploaded: number;
  documentStatuses: StatusCount;
  queries: { open: number; responded: number; resolved: number };
  inspections: { scheduled: number; assigned: number; completed: number; cancelled: number };
  workflows: WorkflowFact[];
  workflowCount: number;
  workflowsTruncated: boolean;
  certificates: { issued: number; expired: number; revoked: number };
  renewals: { due: number; submitted: number; under_review: number; completed: number; expired: number };
  activeSchemes: number;
  schemeClaims: { draft: number; submitted: number };
  grievances: { open: number; assigned: number; in_progress: number; resolved: number; closed: number };
  escalations: number;
  notifications: { total: number; unread: number };
  knowledgeDocuments: number;
  knowledgeChunks: number;
};

export type DepartmentRow = {
  department: string;
  service: string;
  avgDays: string;
  trend: string;
  slaLimit: string;
  complianceRate: number | null;
  status: string;
  statusColor: string;
};

export type AnalyticsView = {
  scopeLabel: string;
  slaCompliance: string;
  slaDetail: string;
  slaTrend: string;
  turnaround: string;
  turnaroundDetail: string;
  turnaroundTrend: string;
  queryRate: string;
  queryDetail: string;
  queryTrend: string;
  inspections: string;
  inspectionDetail: string;
  inspectionTrend: string;
  bannerTitle: string;
  bannerBody: string;
  departments: DepartmentRow[];
};

export function kolkataStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - KOLKATA_OFFSET_MS);
}

export function analyticsRange(timeframe: AnalyticsTimeframe, now: Date): { start: Date; end: Date } {
  if (timeframe === "q3-2025") {
    return { start: kolkataStart(2025, 7, 1), end: kolkataStart(2025, 10, 1) };
  }
  const shifted = new Date(now.getTime() + KOLKATA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const start = timeframe === "ytd" ? kolkataStart(year, 1, 1) : kolkataStart(year, month, 1);
  const end = now.getTime() > start.getTime() ? now : new Date(start.getTime() + 1);
  return { start, end };
}

export function previousRange(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration),
    end: range.start,
  };
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function formatPercent(value: number | null): string {
  if (value == null) return "Not recorded";
  return `${value}%`;
}

function formatDays(value: number | null): string {
  if (value == null) return "Not recorded";
  return `${value} Days`;
}

function numericTrend(current: number | null, previous: number | null, suffix: string): string {
  if (current == null || previous == null) return "Not recorded";
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return "Same as the previous period";
  return `${delta > 0 ? "+" : ""}${delta}${suffix} vs the previous period`;
}

function countTrend(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return "Same as the previous period";
  return `${delta > 0 ? "+" : ""}${delta} vs the previous period`;
}

function queryTotal(facts: AnalyticsFacts): number {
  return facts.queries.open + facts.queries.responded + facts.queries.resolved;
}

function inspectionTotal(facts: AnalyticsFacts): number {
  const inspections = facts.inspections;
  return inspections.scheduled + inspections.assigned + inspections.completed + inspections.cancelled;
}

type Compliance = { onTime: number; late: number; recorded: number; averageDays: number | null };

function complianceOf(workflows: WorkflowFact[], now: Date): Compliance {
  let onTime = 0;
  let late = 0;
  const durations: number[] = [];
  for (const workflow of workflows) {
    if (workflow.slaStartedAt && workflow.slaCompletedAt) {
      const elapsed = new Date(workflow.slaCompletedAt).getTime() - new Date(workflow.slaStartedAt).getTime();
      if (Number.isFinite(elapsed) && elapsed >= 0) durations.push(elapsed / 86_400_000);
    }
    const state = slaState({
      now,
      startedAt: workflow.slaStartedAt,
      deadline: workflow.slaDeadline,
      completedAt: workflow.slaCompletedAt,
    });
    if (state === "not_started") continue;
    if (state === "completed") {
      if (!workflow.slaDeadline || !workflow.slaCompletedAt) continue;
      const done = new Date(workflow.slaCompletedAt).getTime();
      const due = new Date(workflow.slaDeadline).getTime();
      if (!Number.isFinite(done) || !Number.isFinite(due)) continue;
      if (done <= due) onTime += 1;
      else late += 1;
      continue;
    }
    if (state === "overdue") late += 1;
    else onTime += 1;
  }
  const averageDays = durations.length === 0
    ? null
    : Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
  return { onTime, late, recorded: onTime + late, averageDays };
}

function rateOf(compliance: Compliance, truncated: boolean): number | null {
  if (truncated) return null;
  return percent(compliance.onTime, compliance.recorded);
}

const STATUS_COLOR = {
  recorded: "text-slate-700 bg-slate-50 border-slate-200",
  track: "text-emerald-700 bg-emerald-50 border-emerald-200",
  soon: "text-teal-700 bg-teal-50 border-teal-200",
  overdue: "text-amber-700 bg-amber-50 border-amber-200",
};

function departmentRows(facts: AnalyticsFacts, previous: AnalyticsFacts, now: Date): DepartmentRow[] {
  if (facts.workflowsTruncated) {
    return [{
      department: "Recorded workload",
      service: "The department sample is incomplete.",
      avgDays: "Not recorded",
      trend: "Not recorded",
      slaLimit: "Not recorded",
      complianceRate: null,
      status: "Not recorded",
      statusColor: STATUS_COLOR.recorded,
    }];
  }
  const groups = new Map<string, WorkflowFact[]>();
  for (const workflow of facts.workflows) {
    const name = workflow.department || "Not recorded";
    const rows = groups.get(name) ?? [];
    rows.push(workflow);
    groups.set(name, rows);
  }
  const previousGroups = new Map<string, WorkflowFact[]>();
  if (!previous.workflowsTruncated) {
    for (const workflow of previous.workflows) {
      const name = workflow.department || "Not recorded";
      const rows = previousGroups.get(name) ?? [];
      rows.push(workflow);
      previousGroups.set(name, rows);
    }
  }
  return [...groups.entries()].map(([department, workflows]) => {
    const current = complianceOf(workflows, now);
    const earlier = complianceOf(previousGroups.get(department) ?? [], now);
    const dueSoon = workflows.some((workflow) => slaState({
      now,
      startedAt: workflow.slaStartedAt,
      deadline: workflow.slaDeadline,
      completedAt: workflow.slaCompletedAt,
    }) === "due_soon");
    let status = "Not recorded";
    let statusColor = STATUS_COLOR.recorded;
    if (current.recorded > 0 && current.late > 0) {
      status = "Overdue";
      statusColor = STATUS_COLOR.overdue;
    } else if (current.recorded > 0 && dueSoon) {
      status = "Due soon";
      statusColor = STATUS_COLOR.soon;
    } else if (current.recorded > 0) {
      status = "On track";
      statusColor = STATUS_COLOR.track;
    }
    return {
      department,
      service: `${workflows.length} workflows`,
      avgDays: formatDays(current.averageDays),
      trend: numericTrend(current.averageDays, earlier.averageDays, " days"),
      slaLimit: "Not recorded",
      complianceRate: rateOf(current, false),
      status,
      statusColor,
    };
  });
}

export function presentAnalytics(input: {
  current: AnalyticsFacts;
  previous: AnalyticsFacts;
  now: Date;
}): AnalyticsView {
  const current = input.current;
  const previous = input.previous;
  const sla = complianceOf(current.workflows, input.now);
  const previousSla = complianceOf(previous.workflows, input.now);
  const slaRate = rateOf(sla, current.workflowsTruncated);
  const previousSlaRate = rateOf(previousSla, previous.workflowsTruncated);
  const queryRate = current.applications === 0 ? null : percent(queryTotal(current), current.applications);
  const previousQueryRate = previous.applications === 0 ? null : percent(queryTotal(previous), previous.applications);
  const visits = inspectionTotal(current);
  const scopeLabel = current.scope === "system"
    ? "Scope: all recorded activity"
    : current.scope === "department"
      ? "Scope: your departments"
      : "Scope: your records";

  return {
    scopeLabel,
    slaCompliance: formatPercent(slaRate),
    slaDetail: current.workflowsTruncated
      ? "The SLA sample is incomplete."
      : `${sla.recorded} workflows with a system-recorded SLA`,
    slaTrend: numericTrend(slaRate, previousSlaRate, " points"),
    turnaround: formatDays(current.workflowsTruncated ? null : sla.averageDays),
    turnaroundDetail: "System-recorded completion time. Statutory cap: Not recorded.",
    turnaroundTrend: numericTrend(
      current.workflowsTruncated ? null : sla.averageDays,
      previous.workflowsTruncated ? null : previousSla.averageDays,
      " days",
    ),
    queryRate: formatPercent(queryRate),
    queryDetail: `${queryTotal(current)} queries across ${current.applications} applications`,
    queryTrend: numericTrend(queryRate, previousQueryRate, " points"),
    inspections: `${visits} Visits`,
    inspectionDetail: "Consolidation is not recorded.",
    inspectionTrend: countTrend(visits, inspectionTotal(previous)),
    bannerTitle: "Lead-time reduction: Not recorded",
    bannerBody: "No stored comparison of parallel and sequential processing is available. Statutory day savings are not recorded.",
    departments: departmentRows(current, previous, input.now),
  };
}

function count(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error("invalid analytics payload");
  }
  return number;
}

function statusCount(value: unknown): StatusCount {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid analytics payload");
  }
  const counts: StatusCount = {};
  for (const [key, item] of Object.entries(value)) counts[key] = count(item);
  return counts;
}

function bucket(value: unknown, keys: string[]): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid analytics payload");
  }
  const record = value as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const key of keys) counts[key] = count(record[key]);
  return counts;
}

export function readAnalyticsFacts(value: unknown): AnalyticsFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid analytics payload");
  }
  const row = value as Record<string, unknown>;
  const scope = row.scope;
  if (scope !== "own" && scope !== "department" && scope !== "system") {
    throw new Error("invalid analytics payload");
  }
  const parsedWorkflows = Array.isArray(row.workflows) ? row.workflows.map((item) => {
    if (!item || typeof item !== "object") throw new Error("invalid analytics payload");
    const workflow = item as Record<string, unknown>;
    return {
      department: typeof workflow.department === "string" && workflow.department ? workflow.department : "Not recorded",
      slaStartedAt: typeof workflow.slaStartedAt === "string" ? workflow.slaStartedAt : null,
      slaDeadline: typeof workflow.slaDeadline === "string" ? workflow.slaDeadline : null,
      slaCompletedAt: typeof workflow.slaCompletedAt === "string" ? workflow.slaCompletedAt : null,
    };
  }) : null;
  if (!parsedWorkflows) throw new Error("invalid analytics payload");
  return {
    scope,
    projects: count(row.projects),
    applications: count(row.applications),
    applicationStatuses: statusCount(row.applicationStatuses),
    approvalsPending: count(row.approvalsPending),
    approvalStatuses: statusCount(row.approvalStatuses),
    documentsUploaded: count(row.documentsUploaded),
    documentStatuses: statusCount(row.documentStatuses),
    queries: bucket(row.queries, ["open", "responded", "resolved"]) as AnalyticsFacts["queries"],
    inspections: bucket(row.inspections, ["scheduled", "assigned", "completed", "cancelled"]) as AnalyticsFacts["inspections"],
    workflows: parsedWorkflows,
    workflowCount: count(row.workflowCount),
    workflowsTruncated: row.workflowsTruncated === true,
    certificates: bucket(row.certificates, ["issued", "expired", "revoked"]) as AnalyticsFacts["certificates"],
    renewals: bucket(row.renewals, ["due", "submitted", "under_review", "completed", "expired"]) as AnalyticsFacts["renewals"],
    activeSchemes: count(row.activeSchemes),
    schemeClaims: bucket(row.schemeClaims, ["draft", "submitted"]) as AnalyticsFacts["schemeClaims"],
    grievances: bucket(row.grievances, ["open", "assigned", "in_progress", "resolved", "closed"]) as AnalyticsFacts["grievances"],
    escalations: count(row.escalations),
    notifications: bucket(row.notifications, ["total", "unread"]) as AnalyticsFacts["notifications"],
    knowledgeDocuments: count(row.knowledgeDocuments),
    knowledgeChunks: count(row.knowledgeChunks),
  };
}
