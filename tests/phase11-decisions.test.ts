import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { applicationStatusLabel } from "../lib/applications/record";

const ROOT = path.resolve(import.meta.dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("phase 11 approval decisions and certificate issuance", () => {
  it("defines the phase 11 migration file with complete statutory decision constraints", () => {
    const migrationPath = "supabase/migrations/20260928330000_phase11_approval_decisions.sql";
    assert.ok(existsSync(path.join(ROOT, migrationPath)), "Migration file must exist");
    const migration = source(migrationPath);

    // Schema constraint widening
    assert.match(migration, /application_approvals_status_check/);
    assert.match(migration, /'pending',\s*'under_review',\s*'granted',\s*'rejected'/);
    assert.match(migration, /application_department_workflows_status_check/);
    assert.match(migration, /applications_status_check/);
    assert.match(migration, /notifications_type_check/);
    assert.match(migration, /'approval_granted'/);
    assert.match(migration, /'approval_rejected'/);

    // RPC function declaration
    assert.match(migration, /create or replace function public\.record_department_decision/);
    assert.match(migration, /target_workflow uuid/);
    assert.match(migration, /decision text/);
    assert.match(migration, /remarks text default null/);

    // Security & authorization checks in RPC
    assert.match(migration, /auth\.uid\(\) is null/);
    assert.match(migration, /current_user_role\(\) not in \('officer', 'admin'\)/);
    assert.match(migration, /from public\.officer_departments/);
    assert.match(migration, /'officer is not assigned to this department'/);

    // Decision validation
    assert.match(migration, /decision not in \('granted', 'rejected'\)/);
    assert.match(migration, /'rejection remarks are required'/);

    // Idempotency & state machine safety
    assert.match(migration, /alreadyDecided/);
    assert.match(migration, /'cannot change a finalized approval decision'/);

    // Multi-approval rollup safety: application granted ONLY when ALL required approvals granted
    assert.match(migration, /total_required = granted_required/);
    assert.match(migration, /set_config\('udyamsetu\.application_transition', 'allowed', true\)/);

    // Permissions: revoke from public/anon, grant to authenticated
    assert.match(migration, /revoke all on function public\.record_department_decision/);
    assert.match(migration, /grant execute on function public\.record_department_decision/);
  });

  it("formats application status labels accurately for granted and rejected statuses", () => {
    assert.equal(applicationStatusLabel("granted"), "Granted");
    assert.equal(applicationStatusLabel("rejected"), "Rejected");
    assert.equal(applicationStatusLabel("under_review"), "Under Review");
    assert.equal(applicationStatusLabel("submitted"), "Submitted");
    assert.equal(applicationStatusLabel("draft"), "Draft");
    assert.equal(applicationStatusLabel("query_raised"), "Query Raised");
    assert.equal(applicationStatusLabel("unknown_status"), "Not recorded");
  });

  it("provides server actions for recording decisions and issuing certificates", () => {
    const workflowRecords = source("lib/workflow/records.ts");
    assert.match(workflowRecords, /export async function recordDepartmentDecision/);
    assert.match(workflowRecords, /export async function issueCertificateForApproval/);
    assert.match(workflowRecords, /supabase\.rpc\("record_department_decision"/);
    assert.match(workflowRecords, /supabase\.rpc\("issue_approval_certificate"/);
  });

  it("defines secure API route for department workflow decisions", () => {
    const routeSource = source("app/api/department-workflows/[workflowId]/decision/route.ts");
    assert.match(routeSource, /export async function POST/);
    assert.match(routeSource, /workflowId:\s*z\.uuid\(\)/);
    assert.match(routeSource, /bodySchema = z/);
    assert.match(routeSource, /z\.enum\(\["granted", "rejected"\]\)/);
    assert.match(routeSource, /recordDepartmentDecision/);
    assert.match(routeSource, /status: 400/);
    assert.match(routeSource, /status: 404/);
    assert.match(routeSource, /status: result\.status/);
    assert.match(routeSource, /authErrorResponse/);
  });

  it("defines secure API route for statutory certificate issuance", () => {
    const routeSource = source("app/api/approvals/[approvalId]/certificate/route.ts");
    assert.match(routeSource, /export async function POST/);
    assert.match(routeSource, /approvalId:\s*z\.uuid\(\)/);
    assert.match(routeSource, /issueCertificateForApproval/);
    assert.match(routeSource, /status: 404/);
    assert.match(routeSource, /status: 201/);
    assert.match(routeSource, /status: result\.status/);
    assert.match(routeSource, /authErrorResponse/);
  });

  it("wires the officer review UI to execute decisions and certificate issuance", () => {
    const reviewUi = source("app/(officer)/officer-applications/[applicationId]/review.tsx");

    // Live endpoint calls
    assert.match(reviewUi, /\/api\/department-workflows\/\${workflowId}\/decision/);
    assert.match(reviewUi, /\/api\/approvals\/\${approvalId}\/certificate/);

    // Interactive buttons and modals
    assert.match(reviewUi, /Grant Statutory Approval/);
    assert.match(reviewUi, /Record Statutory Rejection/);
    assert.match(reviewUi, /Issue Statutory Certificate/);
    assert.match(reviewUi, /remarksText\.trim\(\)\.length < 5/);

    // Zero demo traces or mock data
    assert.doesNotMatch(reviewUi, /useDemo|INITIAL_THREADS|STATIC_OFFICER_QUEUE/);
    assert.doesNotMatch(reviewUi, /Sharma|EcoFab|US-MH-CTE-2025-01842|Arjun Sharma/);
    assert.doesNotMatch(reviewUi, /A decision is not recorded in this phase/);
  });
});
