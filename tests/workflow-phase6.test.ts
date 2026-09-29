import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseScheduledAt, slaDeadline, slaState } from "../lib/sla/state";

const ROOT = path.resolve(import.meta.dirname, "..");
const migration = readFileSync(
  path.join(ROOT, "supabase/migrations/20260928230000_phase6_inspections_sla_notifications.sql"),
  "utf8",
);

describe("SLA state", () => {
  const start = new Date("2026-09-01T00:00:00.000Z");

  it("does not invent a deadline when no duration is configured", () => {
    assert.equal(slaDeadline(start, null), null);
    assert.equal(slaState({
      now: new Date("2026-09-02T00:00:00.000Z"),
      startedAt: null,
      deadline: null,
      completedAt: null,
    }), "not_started");
  });

  it("calculates a deadline from a configured duration and classifies time", () => {
    const deadline = slaDeadline(start, 200);
    assert.equal(deadline?.toISOString(), "2026-09-09T08:00:00.000Z");
    assert.equal(slaState({
      now: new Date("2026-09-01T12:00:00.000Z"),
      startedAt: start.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      completedAt: null,
    }), "on_track");
    assert.equal(slaState({
      now: new Date("2026-09-09T07:00:00.000Z"),
      startedAt: start.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      completedAt: null,
    }), "due_soon");
    assert.equal(slaState({
      now: new Date("2026-09-10T00:00:00.000Z"),
      startedAt: start.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      completedAt: null,
    }), "overdue");
    assert.equal(slaState({
      now: new Date("2026-09-10T00:00:00.000Z"),
      startedAt: start.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      completedAt: "2026-09-02T00:00:00.000Z",
    }), "completed");
  });

  it("rejects a missing schedule and keeps a real timestamp", () => {
    assert.equal(parseScheduledAt(" "), null);
    assert.equal(parseScheduledAt("not-a-date"), null);
    assert.equal(parseScheduledAt("2026-10-01T10:00:00.000Z"), "2026-10-01T10:00:00.000Z");
  });
});

describe("phase 6 migration and screens", () => {
  it("stores inspections and notifications without demo rows or an invented SLA duration", () => {
    assert.match(migration, /create table if not exists public\.inspections/);
    assert.match(migration, /create table if not exists public\.inspection_reports/);
    assert.match(migration, /create table if not exists public\.notifications/);
    assert.match(migration, /inspections_one_active_per_workflow/);
    assert.match(migration, /notifications_select_own/);
    assert.match(migration, /notifications_one_event/);
    assert.match(migration, /schedule_department_inspection/);
    assert.match(migration, /complete_department_inspection/);
    assert.match(migration, /current_user_role\(\) not in \('officer', 'admin'\)/);
    assert.match(migration, /inspection already scheduled/);
    assert.match(migration, /enqueue_notification/);
    assert.match(migration, /query_raised/);
    assert.match(migration, /query_response_submitted/);
    assert.match(migration, /application_submitted/);
    assert.match(migration, /sla_duration_hours is not null/);
    assert.match(migration, /evaluate_deadline_notifications/);
    assert.doesNotMatch(migration, /update public\.approval_types[\s\S]*sla_duration_hours\s*=/);
    assert.doesNotMatch(migration, /update public\.application_approvals/);
    assert.doesNotMatch(migration, /sla_completed_at = now\(\)/);
    assert.doesNotMatch(migration, /^insert into public\.(inspections|notifications|inspection_reports)/m);
    assert.doesNotMatch(migration, /sharma|ecofab|US-MH-CTE-2025-01842|Arjun/i);
  });

  it("does not render demo inspections or notifications", () => {
    const files = [
      "app/(applicant)/inspections/page.tsx",
      "app/(applicant)/inspections/desk.tsx",
      "app/(applicant)/notifications/page.tsx",
      "app/(applicant)/notifications/center.tsx",
      "app/(officer)/officer-inspections/page.tsx",
      "app/(officer)/officer-inspections/desk.tsx",
    ];
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      assert.doesNotMatch(text, /useDemo|DEMO_PROJECT|INITIAL_INSPECTIONS|INITIAL_NOTIFICATIONS/);
      assert.doesNotMatch(text, /Sharma|EcoFab|US-MH-CTE-2025-01842|Rajesh Patil|30 September 2025/);
    }
    assert.match(readFileSync(path.join(ROOT, "app/api/department-workflows/[workflowId]/inspections/route.ts"), "utf8"), /scheduleDepartmentInspection/);
    assert.match(readFileSync(path.join(ROOT, "app/api/notifications/[notificationId]/read/route.ts"), "utf8"), /markOwnNotificationRead/);
    assert.doesNotMatch(readFileSync(path.join(ROOT, "app/(applicant)/notifications/page.tsx"), "utf8"), /evaluateDeadlineNotifications|evaluate_deadline_notifications/);
  });
});
