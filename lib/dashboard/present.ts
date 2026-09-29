/**
 * Maps owned database rows onto the existing applicant dashboard.
 * Pending approvals stay pending. Missing clocks and day counts stay unrecorded.
 */

import { formatTimestamp, slaState } from "../sla/state";

export type DashboardApproval = {
  status: string;
  category: string | null;
  department: string | null;
};

export type DashboardQuery = {
  applicationId: string;
  status: string;
  body: string;
};

export type DashboardInspection = {
  status: string;
  scheduledAt: string | null;
};

export type DashboardWorkflow = {
  slaStartedAt: string | null;
  slaDeadline: string | null;
  slaCompletedAt: string | null;
};

export type DashboardFacts = {
  unavailable: boolean;
  fullName: string | null;
  project: { entityName: string | null; name: string; sector: string } | null;
  application: { id: string; status: string } | null;
  approvals: DashboardApproval[];
  documentsUploaded: number;
  queries: DashboardQuery[];
  inspections: DashboardInspection[];
  workflows: DashboardWorkflow[];
};

export type DashboardAction = {
  href: string;
  title: string;
  detail: string;
  tone: "red" | "amber" | "blue";
};

export type DashboardStep = {
  href: string;
  label: string;
  caption: string;
  marker: "complete" | "current" | "upcoming";
};

export type DashboardBar = {
  label: string;
  percent: number;
};

export type DashboardView = {
  unavailable: boolean;
  dateLabel: string;
  greetingName: string;
  projectLine: string;
  totalApprovals: number;
  departmentCaption: string;
  completedApprovals: number;
  completedCaption: string;
  inProgressApprovals: number;
  slaCaption: string;
  actionsRequired: number;
  actionsCaption: string;
  healthTitle: string;
  healthBadge: string;
  progress: number;
  bars: DashboardBar[];
  timeSaved: string;
  parallelCaption: string;
  attentionCount: number;
  attentionTitle: string;
  actions: DashboardAction[];
  timelineHref: string;
  steps: DashboardStep[];
};

const NOT_RECORDED = "Not recorded";

function firstName(fullName: string | null): string {
  const name = fullName?.trim();
  if (!name) return NOT_RECORDED;
  return name.split(/\s+/)[0] ?? NOT_RECORDED;
}

function percentOf(rows: DashboardApproval[]): number {
  if (rows.length === 0) return 0;
  const decided = rows.filter((row) => row.status !== "pending").length;
  return Math.round((decided / rows.length) * 100);
}

function slaCaption(workflows: DashboardWorkflow[], now: Date): string {
  const states = workflows.map((workflow) => slaState({
    now,
    startedAt: workflow.slaStartedAt,
    deadline: workflow.slaDeadline,
    completedAt: workflow.slaCompletedAt,
  }));
  const recorded = states.filter((state) => state !== "not_started");
  if (recorded.length === 0) return "SLA: Not recorded";
  if (recorded.includes("overdue")) return "Overdue recorded";
  if (recorded.includes("due_soon")) return "Due soon";
  return "System SLA recorded";
}

const ACTION_TONES = ["red", "amber", "blue"] as const;

function actionSlots(facts: DashboardFacts): DashboardAction[] {
  const slots: DashboardAction[] = [];
  const openQuery = facts.queries.find((query) => query.status === "open");
  if (openQuery) {
    slots.push({
      href: `/applications/${openQuery.applicationId}`,
      title: "Open department query",
      detail: `${openQuery.body.slice(0, 80)} · Due date: ${NOT_RECORDED}`,
      tone: "red",
    });
  }
  const inspection = facts.inspections.find((item) => item.status === "scheduled" || item.status === "assigned");
  if (inspection) {
    slots.push({
      href: "/inspections",
      title: "Inspection recorded",
      detail: `${inspection.status} · ${formatTimestamp(inspection.scheduledAt)}`,
      tone: "amber",
    });
  }
  while (slots.length < 3) {
    slots.push({
      href: "/applications",
      title: NOT_RECORDED,
      detail: "No action is recorded",
      tone: "blue",
    });
  }
  return slots.slice(0, 3).map((slot, index) => ({ ...slot, tone: ACTION_TONES[index] ?? "blue" }));
}

export function presentApplicantDashboard(facts: DashboardFacts, now: Date): DashboardView {
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const approvals = facts.approvals;
  const completed = approvals.filter((row) => row.status !== "pending").length;
  const pending = approvals.filter((row) => row.status === "pending").length;
  const departments = new Set(approvals.map((row) => row.department).filter((value): value is string => Boolean(value)));
  const openQueries = facts.queries.filter((query) => query.status === "open");
  const land = approvals.filter((row) => row.category === "Land & Building");
  const environment = approvals.filter((row) => row.category === "Environment & Pollution");
  const factory = approvals.filter((row) => row.category === "Safety & Fire");
  const utilities = approvals.filter((row) => row.category === "Utilities & Power");
  const projectName = facts.project ? (facts.project.entityName || facts.project.name) : null;
  const attentionCount = openQueries.length + facts.inspections.filter((item) => item.status === "scheduled" || item.status === "assigned").length;
  const applicationHref = facts.application ? `/applications/${facts.application.id}` : "/applications";
  const inspection = facts.inspections[0] ?? null;
  const sla = slaCaption(facts.workflows, now);

  return {
    unavailable: facts.unavailable,
    dateLabel,
    greetingName: facts.unavailable ? NOT_RECORDED : firstName(facts.fullName),
    projectLine: facts.unavailable
      ? "The dashboard is not available."
      : facts.project
        ? `${projectName} · ${facts.project.sector}`
        : "No project is recorded",
    totalApprovals: approvals.length,
    departmentCaption: `Across ${departments.size} departments`,
    completedApprovals: completed,
    completedCaption: NOT_RECORDED,
    inProgressApprovals: pending,
    slaCaption: sla,
    actionsRequired: openQueries.length,
    actionsCaption: openQueries.length > 0
      ? `${openQueries.length} open queries`
      : facts.documentsUploaded > 0
        ? `${facts.documentsUploaded} uploaded · verification not recorded`
        : "No open query is recorded",
    healthTitle: facts.unavailable
      ? "The dashboard is not available."
      : projectName ?? "No project is recorded",
    healthBadge: sla === "SLA: Not recorded" ? NOT_RECORDED : sla,
    progress: approvals.length === 0 ? 0 : completed / approvals.length,
    bars: [
      { label: "Business setup", percent: 0 },
      { label: "Land & building", percent: percentOf(land) },
      { label: "Environment", percent: percentOf(environment) },
      { label: "Factory & labour", percent: percentOf(factory) },
      { label: "Utilities & safety", percent: percentOf(utilities) },
    ],
    timeSaved: "Time saved: Not recorded",
    parallelCaption: "Parallel approvals: Not recorded",
    attentionCount,
    attentionTitle: `${attentionCount} items need your attention`,
    actions: actionSlots(facts),
    timelineHref: applicationHref,
    steps: [
      {
        href: "/approvals",
        label: "Company setup",
        caption: facts.project ? NOT_RECORDED : "No project is recorded",
        marker: "upcoming",
      },
      {
        href: "/documents",
        label: "Land approval",
        caption: land.length === 0 ? NOT_RECORDED : land.every((row) => row.status === "pending") ? "Pending" : "Recorded",
        marker: land.some((row) => row.status !== "pending") ? "complete" : "upcoming",
      },
      {
        href: applicationHref,
        label: "Environmental",
        caption: facts.application ? facts.application.status : NOT_RECORDED,
        marker: facts.application ? "current" : "upcoming",
      },
      {
        href: "/inspections",
        label: "Inspections",
        caption: inspection ? `${inspection.status} · ${formatTimestamp(inspection.scheduledAt)}` : NOT_RECORDED,
        marker: "upcoming",
      },
      {
        href: "/approvals",
        label: "Operation",
        caption: NOT_RECORDED,
        marker: "upcoming",
      },
    ],
  };
}
