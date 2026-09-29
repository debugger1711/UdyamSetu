import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { renewalDueAt, renewalWithinDisplayWindow } from "../lib/renewals/eligibility";
import { evaluateSchemeEligibility } from "../lib/schemes/eligibility";

const ROOT = path.resolve(import.meta.dirname, "..");
const migration = readFileSync(
  path.join(ROOT, "supabase/migrations/20260928240000_phase7_certificates_renewals_schemes_grievances.sql"),
  "utf8",
);

const project = {
  pollutionCategory: "green",
  landClassification: "industrial_estate",
  sector: "Textiles",
  stage: "planning",
};

describe("scheme eligibility", () => {
  it("returns insufficient data when no rule is configured", () => {
    assert.equal(evaluateSchemeEligibility(true, null, project).outcome, "insufficient_data");
    assert.equal(evaluateSchemeEligibility(true, {}, project).outcome, "insufficient_data");
  });

  it("does not treat missing project data as ineligible", () => {
    const result = evaluateSchemeEligibility(true, {
      pollutionCategory: ["green"],
      landClassification: ["industrial_estate"],
    }, { ...project, landClassification: null });
    assert.equal(result.outcome, "insufficient_data");
    assert.match(result.reasons.join(" "), /Land classification is not recorded/);
  });

  it("marks a recorded mismatch as not eligible and a full match as eligible", () => {
    assert.equal(evaluateSchemeEligibility(true, { pollutionCategory: ["orange"] }, project).outcome, "not_eligible");
    assert.equal(evaluateSchemeEligibility(true, {
      pollutionCategory: ["green"],
      landClassification: ["industrial_estate"],
      sector: ["Textiles"],
      stage: ["planning"],
    }, project).outcome, "eligible");
  });

  it("does not apply an unconfigured threshold", () => {
    assert.equal(evaluateSchemeEligibility(true, { totalInvestmentCr: [10] }, project).outcome, "insufficient_data");
    assert.equal(evaluateSchemeEligibility(false, { pollutionCategory: ["green"] }, project).outcome, "not_eligible");
  });
});

describe("renewal dates", () => {
  it("does not invent a due date", () => {
    assert.equal(renewalDueAt(null), null);
    assert.equal(renewalDueAt("  "), null);
    assert.equal(renewalDueAt("2026-03-31T00:00:00.000Z"), "2026-03-31T00:00:00.000Z");
    assert.equal(renewalWithinDisplayWindow(null, new Date("2026-01-01T00:00:00.000Z")), false);
    assert.equal(renewalWithinDisplayWindow("2026-01-20T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")), true);
    assert.equal(renewalWithinDisplayWindow("2026-08-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")), false);
  });
});

describe("phase 7 migration and screens", () => {
  it("gates certificates and does not seed demo rows", () => {
    assert.match(migration, /create table if not exists public\.certificates/);
    assert.match(migration, /create table if not exists public\.renewals/);
    assert.match(migration, /create table if not exists public\.schemes/);
    assert.match(migration, /create table if not exists public\.scheme_applications/);
    assert.match(migration, /create table if not exists public\.grievances/);
    assert.match(migration, /create table if not exists public\.grievance_escalations/);
    assert.match(migration, /certificates_one_per_approval/);
    assert.match(migration, /renewals_one_open/);
    assert.match(migration, /scheme_applications_one_open/);
    assert.match(migration, /certificates_select_participant/);
    assert.match(migration, /grievances_select_participant/);
    assert.match(migration, /created_by = auth\.uid\(\)/);
    assert.match(migration, /current_user_role\(\) not in \('officer', 'admin'\)/);
    assert.match(migration, /raise exception 'approval decision required'/);
    assert.match(migration, /'internal-' \|\| gen_random_uuid\(\)::text/);
    assert.match(migration, /raise exception 'renewal is not configured'/);
    assert.match(migration, /renewal_due_at/);
    assert.match(migration, /certificate_valid/);
    assert.match(migration, /raise exception 'scheme eligibility is insufficient'/);
    assert.match(migration, /raise exception 'escalation path is not configured'/);
    assert.match(migration, /insert into public\.grievance_escalations/);
    assert.match(migration, /enqueue_notification/);
    assert.match(migration, /on conflict \(user_id, type, source_id\) do nothing|enqueue_notification/);
    assert.match(migration, /renewal_due_at is not null/);
    assert.doesNotMatch(migration, /update public\.application_approvals/);
    assert.doesNotMatch(migration, /interval\s+'/);
    assert.doesNotMatch(migration, /^insert into public\.(certificates|renewals|schemes|scheme_applications|grievances|grievance_escalations|grievance_escalation_paths)/m);
    assert.doesNotMatch(migration, /Sharma|EcoFab|US-MH|MH-RTS|REN-MH|SCH-MH/i);
  });

  it("does not render demo certificates, schemes, or grievances", () => {
    const files = [
      "app/(applicant)/renewals/page.tsx",
      "app/(applicant)/renewals/desk.tsx",
      "app/(applicant)/schemes/page.tsx",
      "app/(applicant)/schemes/desk.tsx",
      "app/(applicant)/grievances/page.tsx",
      "app/(applicant)/grievances/desk.tsx",
    ];
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      assert.doesNotMatch(text, /useDemo|DEMO_SCHEMES|SCHEMES_DATA|RENEWALS_DATA|INITIAL_GRIEVANCES|Math\.random/);
      assert.doesNotMatch(text, /Sharma|EcoFab|US-MH-CTE|MH-RTS|REN-MH|SCH-MH|₹42|₹62/);
    }
    assert.match(readFileSync(path.join(ROOT, "app/api/grievances/route.ts"), "utf8"), /createOwnGrievance/);
    assert.match(readFileSync(path.join(ROOT, "app/api/schemes/[schemeId]/applications/route.ts"), "utf8"), /submitOwnSchemeClaim/);
    assert.match(readFileSync(path.join(ROOT, "app/api/renewals/[renewalId]/submit/route.ts"), "utf8"), /submitOwnRenewal/);
    assert.doesNotMatch(readFileSync(path.join(ROOT, "app/(applicant)/renewals/page.tsx"), "utf8"), /evaluateRenewalNotifications|evaluate_renewal_notifications/);
    assert.doesNotMatch(readFileSync(path.join(ROOT, "app/(applicant)/schemes/page.tsx"), "utf8"), /evaluateRenewalNotifications/);
    assert.doesNotMatch(readFileSync(path.join(ROOT, "app/(applicant)/grievances/page.tsx"), "utf8"), /evaluateRenewalNotifications/);
  });
});
