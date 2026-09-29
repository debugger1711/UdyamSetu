import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { toChecklist } from "../lib/approvals/checklist";

const ROOT = path.resolve(import.meta.dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function walk(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath, found);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(fullPath);
    }
  }
  return found;
}

describe("new project form", () => {
  const form = source("app/(applicant)/projects/new/page.tsx");

  it("starts empty and does not submit a demo identity or a silent pollution default", () => {
    assert.match(form, /pollutionCategory: ""/);
    assert.match(form, /stage: ""/);
    assert.match(form, /landClassification: ""/);
    assert.match(form, /Select a pollution category/);
    assert.match(form, /Select a project stage/);
    assert.match(form, /name: formData\.name/);
    assert.match(form, /sector: formData\.sector/);
    assert.match(form, /pollutionCategory: formData\.pollutionCategory/);
    assert.match(form, /stage: formData\.stage/);
    assert.match(form, /location: formData\.location/);
    assert.doesNotMatch(form, /Sharma|Arjun|Rahul|EcoFab|Plot C-14|Chakan|18\.5|handlePreFill|useDemo|DEMO_PROJECT/);
    assert.doesNotMatch(form, /userId|projectId/);
  });
});

describe("signup", () => {
  it("submits only the account fields and does not send a role or a demo enterprise name", () => {
    const page = source("app/(auth)/signup/page.tsx");
    const schema = source("lib/auth/schemas.ts");
    const route = source("app/api/auth/signup/route.ts");
    assert.match(page, /JSON\.stringify\(\{ email, password, fullName \}\)/);
    assert.match(page, /useState\(""\)/);
    assert.doesNotMatch(page, /EcoFab|Sharma|Arjun|Rahul/);
    assert.doesNotMatch(page, /role/);
    assert.match(schema, /fullName: z\.string\(\)\.trim\(\)\.min\(1\)/);
    assert.doesNotMatch(schema.slice(schema.indexOf("signupSchema"), schema.indexOf("createOwnedProjectSchema")), /role/);
    assert.match(route, /role: "applicant"/);
    assert.match(route, /registerApplicant/);
  });
});

describe("approval map", () => {
  const page = source("app/(applicant)/approvals/page.tsx");
  const map = source("app/(applicant)/approvals/approval-map.tsx");

  it("loads owned application approvals and does not treat pending as completed", () => {
    assert.match(page, /listOwnedApplicationApprovals/);
    assert.match(page, /getAuthenticatedUser/);
    assert.doesNotMatch(page, /INITIAL_18_APPROVALS|useDemo|DEMO_PROJECT|Sharma/);
    const checklist = toChecklist([
      {
        id: "approval-1",
        applicationId: "application-1",
        status: "pending",
        sortOrder: 1,
        code: "FIRE_NOC",
        name: "Fire NOC",
        department: "FIRE_SERVICES",
        description: "Stored approval",
        category: "Safety & Fire",
      },
    ]);
    assert.equal(checklist[0]?.status, "Pending");
    assert.notEqual(checklist[0]?.status, "Completed");
    assert.equal(checklist[0]?.slaDays, 0);
    assert.equal(checklist[0]?.estimatedDays, 0);
    assert.throws(() => toChecklist([{
      id: "approval-2",
      applicationId: "application-1",
      status: "granted",
      sortOrder: 1,
      code: "FIRE_NOC",
      name: "Fire NOC",
      department: null,
      description: null,
      category: "Safety & Fire",
    }]));
  });

  it("does not present a hardcoded statutory duration", () => {
    assert.doesNotMatch(map, /19 calendar days|19 working days|54 working days|35 working days|10–15 Days SLA|14 Days SLA|15 Days SLA|Avg\. 12 days/);
    assert.match(map, /Not recorded/);
    assert.doesNotMatch(map, /Sharma|EcoFab|US-MH-CTE-2025-01842/);
    const migration = source("supabase/migrations/20260928280000_phase10d_approval_code_arrays.sql");
    assert.match(migration, /array\['NA_LAND_CONVERSION'\]/);
    assert.match(migration, /array\['PCB_GREEN_CONSENT'\]/);
    assert.match(migration, /array\['MIDC_LAND_ALLOTMENT'\]/);
    assert.doesNotMatch(migration, /codes := codes \|\| '/);
    assert.match(migration, /'pending'/);
  });
});

describe("project hook and documents", () => {
  it("does not keep a demo project hook on production pages", () => {
    const production = [
      ...walk(path.join(ROOT, "app")),
      ...walk(path.join(ROOT, "components")),
    ];
    const combined = production.map((file) => readFileSync(file, "utf8")).join("\n");
    assert.doesNotMatch(combined, /hooks\/use-project|useProject\(/);
    assert.equal(existsSync(path.join(ROOT, "hooks/use-project.ts")), false);
  });

  it("loads applicant documents from the backend and does not use the IndexedDB vault", () => {
    const page = source("app/(applicant)/documents/page.tsx");
    const vault = source("app/(applicant)/documents/documents-vault.tsx");
    const present = source("lib/documents/present.ts");
    assert.match(page, /listOwnedDocuments/);
    assert.match(present, /processingStatus: "uploaded"/);
    assert.match(present, /Not verified/);
    assert.doesNotMatch(`${page}\n${vault}`, /indexed-db|udyamsetu_vault|useDemo|IndexedDB|Sharma/);
  });
});

describe("home, help, and demo fallback", () => {
  it("does not publish demo operational figures or unverified contact details", () => {
    const home = source("app/page.tsx");
    const help = source("app/(applicant)/help/page.tsx");
    assert.doesNotMatch(home, /92%|6 matched|3 paths|3 parallel paths|18 Approvals|18 clearances|42\+|1,800\+|19 days|Profile verified|Combined visit|Verified Data Reuse|Sharma|EcoFab/);
    assert.match(home, /Not recorded/);
    assert.doesNotMatch(help, /19 days|15 working days|DIC Pune|MAITRI|2553 7122|1800 233 4567|support@udyamsetu\.gov\.in|Sharma/);
    assert.match(help, /Not recorded/);
    assert.match(help, /Upload does not mean the document has been verified/);
  });

  it("does not fall back to demo records when an applicant page cannot load data", () => {
    const pages = [
      "app/(applicant)/projects/new/page.tsx",
      "app/(applicant)/approvals/page.tsx",
      "app/(applicant)/documents/page.tsx",
      "app/(applicant)/help/page.tsx",
      "app/page.tsx",
    ];
    const combined = pages.map(source).join("\n");
    assert.doesNotMatch(combined, /DEMO_PROJECT|INITIAL_18_APPROVALS|useDemo|udyamsetu_demo_state_v2|Sharma Manufacturing/);
  });
});
