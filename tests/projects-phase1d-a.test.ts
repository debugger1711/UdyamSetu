import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import { createOwnedProjectSchema } from "../lib/auth/schemas";
import { toProjectInsert, toProjectUpdate } from "../lib/projects/record";
import { LAND_CLASSIFICATIONS } from "../types/project";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("land classification input", () => {
  it("accepts the repository land categories and stores null when omitted", () => {
    for (const value of LAND_CLASSIFICATIONS) {
      const parsed = createOwnedProjectSchema.parse({
        name: "North Unit",
        sector: "Electronics",
        pollutionCategory: "green",
        stage: "pre_establishment",
        totalInvestmentCr: 2,
        location: "Plot 1",
        landClassification: value,
      });
      assert.equal(parsed.landClassification, value);
    }

    const row = toProjectInsert("user-a", {
      name: "North Unit",
      sector: "Electronics",
      pollutionCategory: "green",
      stage: "pre_establishment",
      totalInvestmentCr: 2,
      location: "Plot 1",
    });
    assert.equal(row.land_classification, null);
    assert.equal(row.pollution_category, "green");
    assert.equal(row.stage, "pre_establishment");
    assert.equal(row.user_id, "user-a");
  });

  it("rejects an unknown land classification and a non-positive investment", () => {
    assert.throws(() => createOwnedProjectSchema.parse({
      name: "North Unit",
      sector: "Electronics",
      pollutionCategory: "green",
      stage: "pre_establishment",
      totalInvestmentCr: 2,
      location: "Plot 1",
      landClassification: "midc",
    }), ZodError);
    assert.throws(() => createOwnedProjectSchema.parse({
      name: "North Unit",
      sector: "Electronics",
      totalInvestmentCr: -1,
      location: "Plot 1",
    }), ZodError);
  });

  it("persists a chosen land classification without changing ownership", () => {
    const created = toProjectInsert("user-a", {
      name: "North Unit",
      sector: "Electronics",
      pollutionCategory: "white",
      stage: "operational",
      totalInvestmentCr: 2,
      location: "Plot 1",
      landClassification: "sez",
    });
    const updated = toProjectUpdate("user-a", { landClassification: "private_agricultural" });
    assert.equal(created.land_classification, "sez");
    assert.equal(updated.land_classification, "private_agricultural");
    assert.equal(updated.user_id, "user-a");
    assert.equal("land_classification" in toProjectUpdate("user-a", { name: "Renamed" }), false);
  });
});

describe("phase 1D-A migration", () => {
  it("adds nullable land classification and does not seed projects", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928190000_phase1d_a_land_classification.sql"),
      "utf8",
    );
    assert.match(migration, /add column if not exists land_classification text/);
    assert.match(migration, /land_classification is null/);
    assert.match(migration, /'industrial_estate'/);
    assert.match(migration, /'private_agricultural'/);
    assert.match(migration, /'private_non_agricultural'/);
    assert.match(migration, /'sez'/);
    assert.doesNotMatch(migration, /default 'industrial_estate'/);
    assert.doesNotMatch(migration, /insert into/i);
    assert.doesNotMatch(migration, /sharma|ecofab/i);
  });

  it("does not change the approval rule implementation", () => {
    const rules = readFileSync(path.join(ROOT, "lib/rules/approval-rules.ts"), "utf8");
    assert.match(rules, /export function determineRequiredApprovals/);
    assert.match(rules, /landClassification === "industrial_estate"/);
  });
});
