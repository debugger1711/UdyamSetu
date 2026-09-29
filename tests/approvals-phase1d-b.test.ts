import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { APPROVAL_CATALOG } from "../lib/approvals/catalog";
import { newApprovalPlans, planApplicationApprovals, approvalVisibleTo, dependencyLinks } from "../lib/approvals/plan";
import { determineRequiredApprovals, INSUFFICIENT_PROJECT_INFORMATION } from "../lib/rules/approval-rules";

const ROOT = path.resolve(import.meta.dirname, "..");

const COMMON = ["FIRE_NOC", "FACTORY_PLAN_DISH", "POWER_FEASIBILITY"];

function codes(landClassification: string, pollutionCategory: string): string[] {
  const result = determineRequiredApprovals({ landClassification, pollutionCategory });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return [];
  }
  return result.codes;
}

describe("approval engine", () => {
  it("requires land allotment and both pollution consents for industrial red and orange", () => {
    const expected = ["MIDC_LAND_ALLOTMENT", "PCB_CTE", "PCB_CTO", ...COMMON];
    assert.deepEqual(codes("industrial_estate", "red"), expected);
    assert.deepEqual(codes("industrial_estate", "orange"), expected);
  });

  it("uses the green consent for an industrial green project", () => {
    assert.deepEqual(codes("industrial_estate", "green"), [
      "MIDC_LAND_ALLOTMENT",
      "PCB_GREEN_CONSENT",
      ...COMMON,
    ]);
  });

  it("adds no pollution-board code for industrial white", () => {
    assert.deepEqual(codes("industrial_estate", "white"), ["MIDC_LAND_ALLOTMENT", ...COMMON]);
  });

  it("uses land conversion for private agricultural red", () => {
    assert.deepEqual(codes("private_agricultural", "red"), [
      "NA_LAND_CONVERSION",
      "PCB_CTE",
      "PCB_CTO",
      ...COMMON,
    ]);
  });

  it("uses land conversion and green consent for private non-agricultural green", () => {
    assert.deepEqual(codes("private_non_agricultural", "green"), [
      "NA_LAND_CONVERSION",
      "PCB_GREEN_CONSENT",
      ...COMMON,
    ]);
  });

  it("keeps the existing SEZ branch, which is not an industrial estate", () => {
    assert.deepEqual(codes("sez", "orange"), [
      "NA_LAND_CONVERSION",
      "PCB_CTE",
      "PCB_CTO",
      ...COMMON,
    ]);
    assert.equal(codes("sez", "white").includes("MIDC_LAND_ALLOTMENT"), false);
    assert.equal(codes("sez", "white").includes("PCB_CTE"), false);
  });

  it("does not plan approvals when land classification is missing", () => {
    const result = planApplicationApprovals({
      landClassification: null,
      pollutionCategory: "orange",
    });
    assert.equal(result.ok, false);
    if (!result.ok && result.code === INSUFFICIENT_PROJECT_INFORMATION) {
      assert.deepEqual(result.missing, ["landClassification"]);
    } else {
      assert.fail("missing land produced approvals");
    }
  });

  it("does not invent a pollution category", () => {
    const result = determineRequiredApprovals({
      landClassification: "industrial_estate",
      pollutionCategory: null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, INSUFFICIENT_PROJECT_INFORMATION);
      assert.deepEqual(result.missing, ["pollutionCategory"]);
    }
  });
});

describe("approval generation plan", () => {
  it("does not plan a second copy of an approval type", () => {
    const first = planApplicationApprovals({
      landClassification: "industrial_estate",
      pollutionCategory: "red",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const again = newApprovalPlans(first.planned, first.planned.map((item) => item.approvalTypeId));
    assert.deepEqual(again, []);
  });

  it("rejects a checklist whose code is not in the supplied catalog", () => {
    const result = planApplicationApprovals(
      { landClassification: "industrial_estate", pollutionCategory: "white" },
      [{ id: "land", code: "MIDC_LAND_ALLOTMENT" }],
    );
    assert.equal(result.ok, false);
    if (!result.ok && result.code === "UNKNOWN_APPROVAL_CODE") {
      assert.equal(result.unknown.includes("FIRE_NOC"), true);
    } else {
      assert.fail("unknown code was accepted");
    }
  });

  it("hides an approval that belongs to another application", () => {
    assert.equal(approvalVisibleTo({ application_id: "app-b" }, ["app-a"]), false);
    assert.equal(approvalVisibleTo(null, ["app-a"]), false);
    assert.equal(approvalVisibleTo({ application_id: "app-a" }, ["app-a"]), true);
  });

  it("keeps hard prerequisites from the existing dependency graph", () => {
    const links = dependencyLinks(["MIDC_LAND_ALLOTMENT", "PCB_CTE", "FACTORY_PLAN_DISH", "FIRE_NOC", "PCB_CTO"]);
    assert.deepEqual(links.get("PCB_CTE")?.dependencyCodes, ["MIDC_LAND_ALLOTMENT"]);
    assert.equal(links.get("PCB_CTO")?.dependencyCodes.includes("PCB_CTE"), true);
    assert.equal(links.get("FACTORY_PLAN_DISH")?.canRunParallel, true);
  });

  it("catalogs only the codes the current rule can return", () => {
    assert.deepEqual(APPROVAL_CATALOG.map((entry) => entry.code), [
      "MIDC_LAND_ALLOTMENT",
      "NA_LAND_CONVERSION",
      "PCB_CTE",
      "PCB_CTO",
      "PCB_GREEN_CONSENT",
      "FIRE_NOC",
      "FACTORY_PLAN_DISH",
      "POWER_FEASIBILITY",
    ]);
  });
});

describe("phase 1D-B migration", () => {
  it("creates catalog and instance tables without seeding applications", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928200000_phase1d_b_approval_instances.sql"),
      "utf8",
    );
    assert.match(migration, /create table if not exists public\.approval_types/);
    assert.match(migration, /create table if not exists public\.application_approvals/);
    assert.match(migration, /unique \(application_id, approval_type_id\)/);
    assert.match(migration, /on conflict \(application_id, approval_type_id\) do nothing/);
    assert.match(migration, /status in \('pending'\)/);
    assert.match(migration, /INSUFFICIENT_PROJECT_INFORMATION/);
    assert.match(migration, /application_approvals_select_own/);
    assert.doesNotMatch(migration, /grant insert on public\.application_approvals/i);
    assert.doesNotMatch(migration, /insert into public\.applications/i);
    assert.doesNotMatch(migration, /sharma|ecofab|US-MH-CTE-2025-01842/i);
    for (const entry of APPROVAL_CATALOG) {
      assert.match(migration, new RegExp(entry.code));
    }
  });
});

describe("applicant approval screens", () => {
  it("does not load the demo approval checklist", () => {
    const page = readFileSync(path.join(ROOT, "app/(applicant)/approvals/page.tsx"), "utf8");
    const map = readFileSync(path.join(ROOT, "app/(applicant)/approvals/approval-map.tsx"), "utf8");
    const detail = readFileSync(path.join(ROOT, "app/(applicant)/approvals/[approvalId]/page.tsx"), "utf8");
    for (const source of [page, map, detail]) {
      assert.doesNotMatch(source, /INITIAL_18_APPROVALS/);
      assert.doesNotMatch(source, /useDemo/);
      assert.doesNotMatch(source, /Sharma|EcoFab/);
      assert.doesNotMatch(source, /US-MH-CTE-2025-01842/);
    }
    assert.match(page, /listOwnedApplicationApprovals/);
    assert.match(detail, /getOwnedApproval/);
  });
});
