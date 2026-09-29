import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function walk(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
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

const REMOVED = [
  "lib/demo-context.tsx",
  "hooks/use-project.ts",
  "hooks/use-demo-mode.ts",
  "hooks/use-approvals.ts",
  "hooks/use-applications.ts",
  "lib/storage/indexed-db.ts",
  "lib/repositories/document-repository.ts",
  "lib/repositories/types.ts",
  "lib/validations/pre-validation-engine.ts",
  "data/demo/demo-project.ts",
  "data/demo/demo-approvals.ts",
  "data/demo/demo-applications.ts",
  "data/demo/demo-inspections.ts",
  "data/demo/demo-schemes.ts",
  "data/demo/approvals-engine-data.ts",
  "data/rules/approval-catalog.ts",
];

describe("demo infrastructure removal", () => {
  it("deletes the demo provider, vault, and unused demo hooks", () => {
    for (const relativePath of REMOVED) {
      assert.equal(existsSync(path.join(ROOT, relativePath)), false, relativePath);
    }
    const layout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");
    assert.doesNotMatch(layout, /DemoProvider|demo-context/);
  });

  it("keeps production source off demo identity, demo storage, and demo role switching", () => {
    const files = [
      ...walk(path.join(ROOT, "app")),
      ...walk(path.join(ROOT, "components")),
      ...walk(path.join(ROOT, "lib")),
      ...walk(path.join(ROOT, "hooks")),
    ];
    const combined = files.map((file) => readFileSync(file, "utf8")).join("\n");
    assert.doesNotMatch(combined, /useDemo\(|DemoProvider|DEMO_USER|DEMO_PROJECT|INITIAL_18_APPROVALS|INITIAL_DOCUMENTS|INITIAL_INSPECTIONS|INITIAL_NOTIFICATIONS|INITIAL_SCHEMES/);
    assert.doesNotMatch(combined, /udyamsetu_demo_state_v2|udyamsetu_vault_db|udyamsetu_vault_documents_v1|resetDemoState/);
    assert.doesNotMatch(combined, /Sharma Manufacturing|Arjun Sharma|Rahul Sharma|EcoFab|US-MH-CTE-2025-01842|Plot C-14/);
    assert.match(readFileSync(path.join(ROOT, "app/api/documents/[documentId]/file/route.ts"), "utf8"), /getOwnedDocument/);
    assert.match(readFileSync(path.join(ROOT, "lib/documents/present.ts"), "utf8"), /processingStatus: "uploaded"/);
    assert.match(readFileSync(path.join(ROOT, "lib/approvals/checklist.ts"), "utf8"), /export interface StructuredApproval/);
  });
});
