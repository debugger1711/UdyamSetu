import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  applicationStatusAfterQuery,
  applicationStatusAfterResponse,
  submissionDecision,
} from "../lib/workflow/rules";

const ROOT = path.resolve(import.meta.dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("application submission rules", () => {
  it("submits an owned draft that already has a department approval", () => {
    assert.equal(submissionDecision({
      owned: true,
      status: "draft",
      approvalCount: 4,
      departmentApprovalCount: 3,
    }), "submit");
  });

  it("rejects another user's application, a non-draft, a missing checklist, and a checklist with no department", () => {
    assert.equal(submissionDecision({
      owned: false,
      status: "draft",
      approvalCount: 2,
      departmentApprovalCount: 2,
    }), "not_found");
    assert.equal(submissionDecision({
      owned: true,
      status: "submitted",
      approvalCount: 2,
      departmentApprovalCount: 2,
    }), "not_draft");
    assert.equal(submissionDecision({
      owned: true,
      status: "draft",
      approvalCount: 0,
      departmentApprovalCount: 0,
    }), "checklist_missing");
    assert.equal(submissionDecision({
      owned: true,
      status: "draft",
      approvalCount: 1,
      departmentApprovalCount: 0,
    }), "department_missing");
  });

  it("raises a query without approving, and does not resolve it when the applicant responds", () => {
    assert.equal(applicationStatusAfterQuery(), "query_raised");
    assert.equal(applicationStatusAfterResponse(0), "query_response_submitted");
    assert.equal(applicationStatusAfterResponse(1), "query_raised");
  });
});

describe("phase 5 migration", () => {
  it("creates department workflows and queries without demo rows or approval decisions", () => {
    const migration = source("supabase/migrations/20260928220000_phase5_submission_workflow.sql");
    assert.match(migration, /create table if not exists public\.departments/);
    assert.match(migration, /create table if not exists public\.application_department_workflows/);
    assert.match(migration, /create table if not exists public\.application_queries/);
    assert.match(migration, /create table if not exists public\.application_query_responses/);
    assert.match(migration, /status in \('submitted'\)/);
    assert.match(migration, /'draft',\s*'submitted',\s*'under_review',\s*'query_raised',\s*'query_response_submitted'/);
    assert.match(migration, /submit_application/);
    assert.match(migration, /raise_department_query/);
    assert.match(migration, /respond_to_query/);
    assert.match(migration, /application is not a draft/);
    assert.match(migration, /approval checklist missing/);
    assert.match(migration, /set status = 'query_raised'/);
    assert.match(migration, /set status = 'responded'/);
    assert.match(migration, /workflows_select_participant/);
    assert.match(migration, /queries_select_participant/);
    assert.doesNotMatch(migration, /update public\.application_approvals/);
    assert.doesNotMatch(migration, /grant insert on public\.application_department_workflows/i);
    assert.doesNotMatch(migration, /grant insert on public\.application_queries/i);
    assert.doesNotMatch(migration, /^insert into public\.(applications|projects|profiles|documents|officer_departments|application_queries)/m);
    assert.doesNotMatch(migration, /sharma|ecofab|US-MH-CTE-2025-01842|Arjun/i);
    assert.doesNotMatch(migration, /approved|rejected|certificate_issued/);
  });
});

describe("phase 5 screens and role boundary", () => {
  it("does not load demo applications, officers, or queries", () => {
    const files = [
      "app/(applicant)/applications/[applicationId]/page.tsx",
      "app/(applicant)/messages/page.tsx",
      "app/(applicant)/messages/messages-desk.tsx",
      "app/(officer)/officer-dashboard/page.tsx",
      "app/(officer)/officer-dashboard/queue.tsx",
      "app/(officer)/officer-applications/page.tsx",
      "app/(officer)/officer-applications/[applicationId]/page.tsx",
      "app/(officer)/officer-applications/[applicationId]/review.tsx",
    ];
    for (const file of files) {
      const text = source(file);
      assert.doesNotMatch(text, /useDemo|INITIAL_THREADS|STATIC_OFFICER_QUEUE/);
      assert.doesNotMatch(text, /Sharma|EcoFab|US-MH-CTE-2025-01842|Arjun Sharma/);
    }
    assert.match(source("app/(applicant)/applications/[applicationId]/page.tsx"), /SubmitApplicationButton/);
    assert.match(source("app/api/applications/[applicationId]/submit/route.ts"), /submitOwnedApplication/);
    assert.match(source("lib/auth/schemas.ts"), /signupSchema = z[\s\S]*\.strict\(\)/);
    assert.doesNotMatch(source("lib/auth/schemas.ts"), /role:/);
  });
});
