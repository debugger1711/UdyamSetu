import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import { createOwnedProjectSchema } from "../lib/auth/schemas";
import {
  toProjectInsert,
  toProjectUpdate,
  toPublicProject,
  visibleProject,
  visibleProjects,
  type ProjectRow,
} from "../lib/projects/record";

const ROOT = path.resolve(import.meta.dirname, "..");

const owned: ProjectRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "user-a",
  name: "North Unit",
  entity_name: "North Unit Pvt Ltd",
  sector: "Electronics",
  pollution_category: "orange",
  total_investment_cr: 2.5,
  stage: "pre_establishment",
  location: "Plot 1",
  land_classification: null,
};

describe("project creation", () => {
  it("assigns ownership from the authenticated user", () => {
    const row = toProjectInsert("user-a", {
      name: "North Unit",
      sector: "Electronics",
      totalInvestmentCr: 2.5,
      location: "Plot 1",
      entityName: "North Unit Pvt Ltd",
      pollutionCategory: "orange",
      stage: "pre_establishment",
    });

    assert.equal(row.user_id, "user-a");
    assert.equal(row.name, "North Unit");
    assert.equal(row.location, "Plot 1");
    assert.equal("userId" in row, false);
  });

  it("rejects a missing session field set and a client owner id", () => {
    assert.throws(() => createOwnedProjectSchema.parse({
      sector: "Electronics",
      totalInvestmentCr: 2.5,
      location: "Plot 1",
    }), ZodError);
    assert.throws(() => createOwnedProjectSchema.parse({
      name: "North Unit",
      sector: "Electronics",
      totalInvestmentCr: 2.5,
      location: "Plot 1",
      userId: "user-b",
    }), ZodError);
  });

  it("rejects invalid project data", () => {
    assert.throws(() => createOwnedProjectSchema.parse({
      name: "",
      sector: "Electronics",
      totalInvestmentCr: 0,
      location: "",
    }), ZodError);
  });
});

describe("project access", () => {
  it("returns a project only to its owner", () => {
    assert.equal(visibleProject(owned, "user-a")?.id, owned.id);
    assert.equal(visibleProject(owned, "user-b"), null);
    assert.equal(visibleProject(null, "user-a"), null);
    assert.deepEqual(visibleProjects([owned], "user-b"), []);
  });

  it("hides the owner id from the public project payload", () => {
    const payload = toPublicProject(owned);
    assert.equal(payload.id, owned.id);
    assert.equal("user_id" in payload, false);
  });
});

describe("project update", () => {
  it("keeps the update owned by the signed-in user", () => {
    const row = toProjectUpdate("user-a", { name: "Renamed Unit", location: "Plot 2" });
    assert.equal(row.user_id, "user-a");
    assert.equal(row.name, "Renamed Unit");
    assert.equal(row.location, "Plot 2");
    assert.equal("userId" in row, false);
  });

  it("does not expose another user's row after an update", () => {
    assert.equal(visibleProject({ ...owned, user_id: "user-b" }, "user-a"), null);
  });
});

describe("project screens", () => {
  it("loads the requested project id and does not render the demo companies", () => {
    const list = readFileSync(path.join(ROOT, "app/(applicant)/projects/page.tsx"), "utf8");
    const detail = readFileSync(path.join(ROOT, "app/(applicant)/projects/[projectId]/page.tsx"), "utf8");
    const form = readFileSync(path.join(ROOT, "app/(applicant)/projects/new/page.tsx"), "utf8");

    assert.match(detail, /projectId/);
    assert.match(detail, /getOwnedProject\(projectId\)/);
    assert.match(detail, /result\.data\.id !== projectId/);
    assert.doesNotMatch(list, /Sharma|EcoFab/i);
    assert.doesNotMatch(detail, /Sharma|EcoFab/i);
    assert.doesNotMatch(list, /demo-context/);
    assert.doesNotMatch(detail, /demo-context/);
    assert.doesNotMatch(form, /useDemo|updateProject|demo-context/);
    assert.match(form, /\/api\/projects/);
    assert.match(form, /\/projects\/\$\{body\.project\.id\}/);
  });
});

describe("phase 1B project field migration", () => {
  it("adds only the displayed identity fields and does not seed projects", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928170000_phase1b_project_fields.sql"),
      "utf8",
    );
    assert.match(migration, /add column if not exists entity_name text/);
    assert.match(migration, /add column if not exists location text/);
    assert.doesNotMatch(migration, /insert into/i);
    assert.doesNotMatch(migration, /sharma|ecofab/i);
  });
});
