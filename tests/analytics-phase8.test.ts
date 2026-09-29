import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  analyticsRange,
  presentAnalytics,
  readAnalyticsFacts,
  type AnalyticsFacts,
} from "../lib/analytics/metrics";
import { slaState } from "../lib/sla/state";

const ROOT = path.resolve(import.meta.dirname, "..");
const NOW = new Date("2026-09-28T12:00:00.000Z");

function facts(partial: Partial<AnalyticsFacts> = {}): AnalyticsFacts {
  return {
    scope: "own",
    projects: 0,
    applications: 0,
    applicationStatuses: {},
    approvalsPending: 0,
    approvalStatuses: {},
    documentsUploaded: 0,
    documentStatuses: {},
    queries: { open: 0, responded: 0, resolved: 0 },
    inspections: { scheduled: 0, assigned: 0, completed: 0, cancelled: 0 },
    workflows: [],
    workflowCount: 0,
    workflowsTruncated: false,
    certificates: { issued: 0, expired: 0, revoked: 0 },
    renewals: { due: 0, submitted: 0, under_review: 0, completed: 0, expired: 0 },
    activeSchemes: 0,
    schemeClaims: { draft: 0, submitted: 0 },
    grievances: { open: 0, assigned: 0, in_progress: 0, resolved: 0, closed: 0 },
    escalations: 0,
    notifications: { total: 0, unread: 0 },
    knowledgeDocuments: 0,
    knowledgeChunks: 0,
    ...partial,
  };
}

function view(current: Partial<AnalyticsFacts>, previous: Partial<AnalyticsFacts> = {}) {
  return presentAnalytics({
    current: facts(current),
    previous: facts(previous),
    now: NOW,
  });
}

describe("phase 8 analytics metrics", () => {
  it("keeps an empty period at zero and does not invent a compliance rate", () => {
    const result = view({});
    assert.equal(result.slaCompliance, "Not recorded");
    assert.equal(result.queryRate, "Not recorded");
    assert.equal(result.inspections, "0 Visits");
    assert.equal(result.turnaround, "Not recorded");
    assert.deepEqual(result.departments, []);
    assert.match(result.bannerTitle, /Not recorded/);
    assert.doesNotMatch(result.turnaroundDetail, /21/);
  });

  it("counts application statuses and a query rate from stored rows", () => {
    const parsed = readAnalyticsFacts({
      ...facts({
        applications: 2,
        applicationStatuses: { draft: 1, submitted: 1 },
        queries: { open: 1, responded: 0, resolved: 0 },
        approvalStatuses: { pending: 2 },
        approvalsPending: 2,
        documentsUploaded: 1,
        documentStatuses: { uploaded: 1 },
      }),
    });
    assert.deepEqual(parsed.applicationStatuses, { draft: 1, submitted: 1 });
    assert.deepEqual(parsed.approvalStatuses, { pending: 2 });
    assert.equal(parsed.documentsUploaded, 1);
    assert.equal(view(parsed).queryRate, "50%");
    assert.equal(view({ applications: 4 }).queryRate, "0%");
  });

  it("classifies system SLA with the shared helper and leaves a missing clock unrecorded", () => {
    assert.equal(slaState({
      now: NOW,
      startedAt: null,
      deadline: null,
      completedAt: null,
    }), "not_started");
    const missing = view({
      workflows: [{ department: "MPCB", slaStartedAt: null, slaDeadline: null, slaCompletedAt: null }],
      workflowCount: 1,
    });
    assert.equal(missing.slaCompliance, "Not recorded");
    assert.equal(missing.departments[0]?.status, "Not recorded");
    assert.equal(missing.departments[0]?.slaLimit, "Not recorded");

    const mixed = view({
      workflows: [
        {
          department: "MPCB",
          slaStartedAt: "2026-09-01T12:00:00.000Z",
          slaDeadline: "2026-10-20T12:00:00.000Z",
          slaCompletedAt: null,
        },
        {
          department: "MPCB",
          slaStartedAt: "2026-09-01T12:00:00.000Z",
          slaDeadline: "2026-09-01T12:00:00.000Z",
          slaCompletedAt: null,
        },
      ],
      workflowCount: 2,
    });
    assert.equal(mixed.slaCompliance, "50%");
    assert.equal(mixed.departments[0]?.status, "Overdue");
    assert.equal(view({
      workflows: [{
        department: "DISH",
        slaStartedAt: "2026-09-01T12:00:00.000Z",
        slaDeadline: "2026-09-29T12:00:00.000Z",
        slaCompletedAt: null,
      }],
      workflowCount: 1,
    }).departments[0]?.status, "Due soon");
  });

  it("uses a stored completion interval and does not treat upload as verification", () => {
    const result = view({
      documentsUploaded: 2,
      documentStatuses: { uploaded: 2 },
      workflows: [{
        department: "DISH",
        slaStartedAt: "2026-09-01T12:00:00.000Z",
        slaDeadline: "2026-09-20T12:00:00.000Z",
        slaCompletedAt: "2026-09-10T12:00:00.000Z",
      }],
      workflowCount: 1,
      certificates: { issued: 0, expired: 0, revoked: 0 },
      renewals: { due: 0, submitted: 0, under_review: 0, completed: 0, expired: 0 },
      activeSchemes: 0,
      schemeClaims: { draft: 0, submitted: 0 },
    });
    assert.equal(result.turnaround, "9 Days");
    assert.equal(result.slaCompliance, "100%");
    assert.doesNotMatch(`${result.slaDetail} ${result.queryDetail}`, /verified/i);
  });

  it("rejects a partial SLA sample and a payload that is not a real count", () => {
    const truncated = view({
      workflowsTruncated: true,
      workflows: [{
        department: "MPCB",
        slaStartedAt: "2026-09-01T12:00:00.000Z",
        slaDeadline: "2026-10-20T12:00:00.000Z",
        slaCompletedAt: null,
      }],
      workflowCount: 2001,
    });
    assert.equal(truncated.slaCompliance, "Not recorded");
    assert.equal(truncated.departments[0]?.service, "The department sample is incomplete.");
    assert.throws(() => readAnalyticsFacts({ scope: "own" }));
    assert.throws(() => readAnalyticsFacts(null));
  });

  it("scopes the selected periods without a statutory quarter label in the calculation", () => {
    const quarter = analyticsRange("q3-2025", NOW);
    assert.equal(quarter.start.toISOString(), "2025-06-30T18:30:00.000Z");
    assert.equal(quarter.end.toISOString(), "2025-09-30T18:30:00.000Z");
    const month = analyticsRange("monthly", NOW);
    assert.equal(month.start.toISOString(), "2026-08-31T18:30:00.000Z");
    assert.equal(view({ scope: "department" }).scopeLabel, "Scope: your departments");
    assert.equal(view({ scope: "system" }).scopeLabel, "Scope: all recorded activity");
  });
});

describe("phase 8 analytics boundaries", () => {
  it("keeps counts scoped and does not seed demo analytics", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928260000_phase8_analytics.sql"),
      "utf8",
    );
    const page = readFileSync(path.join(ROOT, "app/(applicant)/analytics/page.tsx"), "utf8");
    const route = readFileSync(path.join(ROOT, "app/api/analytics/route.ts"), "utf8");
    assert.match(migration, /authentication required/);
    assert.match(migration, /p\.user_id = viewer\.id/);
    assert.match(migration, /officer_departments/);
    assert.match(migration, /department_workflow_id/);
    assert.match(migration, /when 'admin' then 'system'/);
    assert.match(migration, /revoke all on function public\.analytics_snapshot/);
    assert.doesNotMatch(migration, /insert into|Sharma|EcoFab|84\.6|granted|approved/i);
    assert.doesNotMatch(page, /useDemo|Sharma|EcoFab|DEPARTMENT_METRICS|84\.6|1,248|13\.8/);
    assert.match(page, /\/api\/analytics/);
    assert.doesNotMatch(route, /searchParams\.get\("role"\)|userId|createAdminClient/);
    assert.match(route, /status: 503/);
    assert.match(route, /status: 401/);
  });
});
