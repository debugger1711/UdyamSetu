import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP_DIRECTORIES = new Set(["node_modules", ".next", "coverage", "tests"]);

function sourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...sourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) || entry === ".env.example") {
      files.push(fullPath);
    }
  }

  return files;
}

describe("service role boundary", () => {
  it("does not publish the service role key or import it from client code", () => {
    const files = sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const relative = path.relative(ROOT, file).replaceAll("\\", "/");
      const source = readFileSync(file, "utf8");
      const isAdminModule = relative === "lib/supabase/admin.ts";
      const isEnvExample = relative === ".env.example";

      if (source.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
        violations.push(`${relative} exposes the service role key with a public prefix`);
      }

      if (!isAdminModule && !isEnvExample && source.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        violations.push(`${relative} reads SUPABASE_SERVICE_ROLE_KEY`);
      }

      const isClientModule = source.includes('"use client"') || source.includes("'use client'");
      if (
        isClientModule &&
        (source.includes("@/lib/supabase/admin") ||
          source.includes("@/lib/supabase/server") ||
          source.includes("lib/supabase/admin") ||
          source.includes("lib/supabase/server"))
      ) {
        violations.push(`${relative} imports a server-only Supabase module`);
      }
    }

    assert.deepEqual(violations, []);
  });

  it("marks the admin client as server-only", () => {
    const source = readFileSync(path.join(ROOT, "lib/supabase/admin.ts"), "utf8");
    assert.match(source, /import "server-only"/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  });
});
