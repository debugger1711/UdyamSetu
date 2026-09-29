import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { presentApplicantDashboard, type DashboardFacts } from "../lib/dashboard/present";

const ROOT = path.resolve(import.meta.dirname, "..");
const NOW = new Date("2026-09-28T12:00:00.000Z");

function facts(partial: Partial<DashboardFacts> = {}): DashboardFacts {
  return {
    unavailable: false,
    fullName: null,
    project: null,
    application: null,
    approvals: [],
    documentsUploaded: 0,
    queries: [],
    inspections: [],
    workflows: [],
    ...partial,
  };
}

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("applicant dashboard presenter", () => {
  it("shows an honest empty state and does not invent demo identity", () => {
    const view = presentApplicantDashboard(facts(), NOW);
    const serialized = JSON.stringify(view);
    assert.equal(view.greetingName, "Not recorded");
    assert.equal(view.projectLine, "No project is recorded");
    assert.equal(view.totalApprovals, 0);
    assert.equal(view.completedApprovals, 0);
    assert.equal(view.inProgressApprovals, 0);
    assert.equal(view.actionsRequired, 0);
    assert.equal(view.progress, 0);
    assert.equal(view.slaCaption, "SLA: Not recorded");
    assert.equal(view.healthBadge, "Not recorded");
    assert.equal(view.timeSaved, "Time saved: Not recorded");
    assert.equal(view.timelineHref, "/applications");
    assert.equal(view.steps[2]?.caption, "Not recorded");
    assert.doesNotMatch(serialized, /Sharma|EcoFab|Arjun|Rahul|US-MH-CTE-2025-01842|Chakan/);
    assert.doesNotMatch(serialized, /\b(15|19|12|30) days\b/);
    assert.doesNotMatch(serialized, /\bverified\b/i);
    assert.doesNotMatch(serialized, /Granted|Completed/);
  });

  it("keeps pending approvals pending and does not count them as completed", () => {
    const view = presentApplicantDashboard(facts({
      fullName: "Meera Joshi",
      project: { entityName: "North Unit", name: "North Unit", sector: "Textiles" },
      application: { id: "11111111-1111-4111-8111-111111111111", status: "submitted" },
      approvals: [
        { status: "pending", category: "Land & Building", department: "MIDC" },
        { status: "pending", category: "Environment & Pollution", department: "MPCB" },
        { status: "pending", category: "Utilities & Power", department: null },
      ],
    }), NOW);
    assert.equal(view.greetingName, "Meera");
    assert.equal(view.projectLine, "North Unit · Textiles");
    assert.equal(view.totalApprovals, 3);
    assert.equal(view.completedApprovals, 0);
    assert.equal(view.inProgressApprovals, 3);
    assert.equal(view.departmentCaption, "Across 2 departments");
    assert.equal(view.progress, 0);
    assert.equal(view.bars[1]?.percent, 0);
    assert.equal(view.steps[1]?.caption, "Pending");
    assert.equal(view.steps[1]?.marker, "upcoming");
    assert.equal(view.steps[2]?.caption, "submitted");
    assert.notEqual(view.steps[2]?.caption, "Granted");
    assert.equal(view.timelineHref, "/applications/11111111-1111-4111-8111-111111111111");
  });

  it("reflects an uploaded document without treating it as verified or as a completed approval", () => {
    const view = presentApplicantDashboard(facts({
      documentsUploaded: 2,
      approvals: [{ status: "pending", category: "Environment & Pollution", department: "MPCB" }],
    }), NOW);
    assert.equal(view.actionsRequired, 0);
    assert.equal(view.completedApprovals, 0);
    assert.match(view.actionsCaption, /2 uploaded/);
    assert.match(view.actionsCaption, /verification not recorded/);
    assert.doesNotMatch(JSON.stringify(view), /\bverified\b/i);
  });

  it("uses an open query as the action and leaves the due date unrecorded", () => {
    const view = presentApplicantDashboard(facts({
      queries: [
        { applicationId: "22222222-2222-4222-8222-222222222222", status: "open", body: "Please clarify the plot boundary." },
        { applicationId: "22222222-2222-4222-8222-222222222222", status: "responded", body: "Answered." },
      ],
    }), NOW);
    assert.equal(view.actionsRequired, 1);
    assert.equal(view.attentionCount, 1);
    assert.equal(view.actions[0]?.title, "Open department query");
    assert.match(view.actions[0]?.detail ?? "", /Due date: Not recorded/);
    assert.doesNotMatch(view.actions[0]?.detail ?? "", /Due today|Due in 2 days/);
    assert.equal(view.actions[0]?.href, "/applications/22222222-2222-4222-8222-222222222222");
  });

  it("shows a stored inspection and a stored SLA without a statutory day count", () => {
    const view = presentApplicantDashboard(facts({
      inspections: [{ status: "scheduled", scheduledAt: "2026-10-02T04:30:00.000Z" }],
      workflows: [{
        slaStartedAt: "2026-09-01T00:00:00.000Z",
        slaDeadline: "2026-10-20T00:00:00.000Z",
        slaCompletedAt: null,
      }],
    }), NOW);
    assert.match(view.steps[3]?.caption ?? "", /scheduled/);
    assert.match(view.actions[0]?.detail ?? "", /scheduled/);
    assert.equal(view.slaCaption, "System SLA recorded");
    assert.doesNotMatch(JSON.stringify(view), /\b(15|19|12|30) days\b/);
  });

  it("reports an overdue stored SLA and a missing SLA as not a statutory deadline", () => {
    const overdue = presentApplicantDashboard(facts({
      workflows: [{
        slaStartedAt: "2026-09-01T00:00:00.000Z",
        slaDeadline: "2026-09-02T00:00:00.000Z",
        slaCompletedAt: null,
      }],
    }), NOW);
    const missing = presentApplicantDashboard(facts({
      workflows: [{ slaStartedAt: null, slaDeadline: null, slaCompletedAt: null }],
    }), NOW);
    assert.equal(overdue.slaCaption, "Overdue recorded");
    assert.equal(missing.slaCaption, "SLA: Not recorded");
    assert.equal(missing.healthBadge, "Not recorded");
  });

  it("shows unavailable instead of demo values when the backend cannot be read", () => {
    const view = presentApplicantDashboard(facts({ unavailable: true, fullName: "Meera Joshi" }), NOW);
    assert.equal(view.unavailable, true);
    assert.equal(view.projectLine, "The dashboard is not available.");
    assert.equal(view.greetingName, "Not recorded");
    assert.equal(view.totalApprovals, 0);
  });
});

describe("applicant dashboard sources", () => {
  const page = source("app/(applicant)/dashboard/page.tsx");
  const loader = source("lib/dashboard/load.ts");
  const presenter = source("lib/dashboard/present.ts");
  const dashboardSources = `${page}\n${loader}\n${presenter}`;

  it("rejects an unauthenticated request in the page and derives identity from the session", () => {
    assert.match(page, /error\.status === 401/);
    assert.match(page, /redirect\("\/login"\)/);
    assert.match(loader, /getCurrentProfile\(/);
    assert.match(loader, /createClient\(/);
    assert.doesNotMatch(loader, /searchParams|userId|serviceRole|service_role|createServiceClient/);
  });

  it("does not use DemoProvider, useDemo, INITIAL_ data, or hardcoded demo identity", () => {
    assert.doesNotMatch(dashboardSources, /useDemo|DemoProvider|INITIAL_|DEMO_USER|DEMO_PROJECT|localStorage|sessionStorage|IndexedDB|udyamsetu_demo_state_v2|udyamsetu_vault/);
    assert.doesNotMatch(dashboardSources, /Sharma|EcoFab|Arjun|Rahul|US-MH-CTE-2025-01842|Plot C-14|Chakan/);
    assert.doesNotMatch(page, /"use client"/);
  });

  it("keeps ownership checks while breaking the profile and project policy cycle", () => {
    const migration = source("supabase/migrations/20260928270000_phase10b_rls_recursion.sql");
    assert.match(migration, /security definer/);
    assert.match(migration, /set row_security = off/);
    assert.match(migration, /od\.user_id = auth\.uid\(\)/);
    assert.match(migration, /p\.user_id = target_profile/);
    assert.doesNotMatch(migration, /grant execute on function public\.officer_assigned_to_project\(uuid\) to anon/i);
    assert.doesNotMatch(migration, /using \(true\)/);
  });
});
