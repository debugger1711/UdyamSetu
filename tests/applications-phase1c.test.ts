import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import {
  canCreateApplication,
  toApplicationInsert,
  toPublicApplication,
  visibleApplication,
  visibleApplications,
} from "../lib/applications/record";
import { createOwnedApplicationSchema } from "../lib/auth/schemas";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("application creation", () => {
  it("creates a draft on the caller's project and ignores a client owner", () => {
    const row = toApplicationInsert("project-a", { title: "Consent draft" });
    assert.equal(row.project_id, "project-a");
    assert.equal(row.title, "Consent draft");
    assert.equal(row.status, "draft");
    assert.equal(row.approval_id, null);
    assert.equal("user_id" in row, false);
    assert.notEqual(row.project_id, "US-MH-CTE-2025-01842");
  });

  it("rejects an unauthenticated-style body that tries to set an owner", () => {
    assert.throws(() => createOwnedApplicationSchema.parse({
      title: "Consent draft",
      userId: "user-b",
    }), ZodError);
    assert.throws(() => createOwnedApplicationSchema.parse({
      title: "Consent draft",
      role: "officer",
      ownerId: "user-b",
    }), ZodError);
  });

  it("rejects an empty title", () => {
    assert.throws(() => createOwnedApplicationSchema.parse({ title: "  " }), ZodError);
  });

  it("allows creation only for a project owned by the caller", () => {
    assert.equal(canCreateApplication({ id: "project-a", user_id: "user-a" }, "user-a"), true);
    assert.equal(canCreateApplication({ id: "project-a", user_id: "user-a" }, "user-b"), false);
    assert.equal(canCreateApplication(null, "user-a"), false);
  });
});

describe("application access", () => {
  const application = {
    id: "22222222-2222-4222-8222-222222222222",
    project_id: "project-a",
    title: "Consent draft",
    approval_id: null,
    status: "draft",
    submitted_at: null,
  };

  it("lists only applications on the caller's projects", () => {
    const other = { ...application, id: "33333333-3333-4333-8333-333333333333", project_id: "project-b" };
    assert.deepEqual(visibleApplications([application, other], ["project-a"]).map((item) => item.id), [application.id]);
  });

  it("hides a missing application and another user's application the same way", () => {
    assert.equal(visibleApplication(application, ["project-a"])?.id, application.id);
    assert.equal(visibleApplication(application, ["project-b"]), null);
    assert.equal(visibleApplication(null, ["project-a"]), null);
    assert.equal("user_id" in toPublicApplication(application), false);
  });
});

describe("application screens", () => {
  it("uses the route id and does not render the demo application", () => {
    const list = readFileSync(path.join(ROOT, "app/(applicant)/applications/page.tsx"), "utf8");
    const detail = readFileSync(path.join(ROOT, "app/(applicant)/applications/[applicationId]/page.tsx"), "utf8");
    const form = readFileSync(path.join(ROOT, "app/(applicant)/applications/create-form.tsx"), "utf8");

    assert.match(detail, /applicationId/);
    assert.match(detail, /getOwnedApplication\(applicationId\)/);
    assert.match(detail, /result\.data\.id !== applicationId/);
    assert.match(form, /\/api\/projects\/\$\{projectId\}\/applications/);
    assert.match(form, /\/applications\/\$\{body\.application\.id\}/);
    for (const source of [list, detail, form]) {
      assert.doesNotMatch(source, /US-MH-CTE-2025-01842/);
      assert.doesNotMatch(source, /Sharma|EcoFab/i);
      assert.doesNotMatch(source, /demo-context|DEMO_PROJECT/);
    }
  });
});

describe("phase 1C application migration", () => {
  it("adds a title and does not seed applications or weaken RLS", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928180000_phase1c_application_identity.sql"),
      "utf8",
    );
    assert.match(migration, /add column if not exists title text/);
    assert.match(migration, /alter column approval_id drop not null/);
    assert.doesNotMatch(migration, /using \(true\)/i);
    assert.doesNotMatch(migration, /insert into/i);
    assert.doesNotMatch(migration, /US-MH-CTE|sharma|ecofab/i);
  });
});
