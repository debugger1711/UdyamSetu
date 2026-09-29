import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const migration = readFileSync(
  path.join(ROOT, "supabase/migrations/20260928150000_phase1a_identity_ownership.sql"),
  "utf8",
);

describe("phase 1A migration source contract", () => {
  it("requires an owner on projects and applications", () => {
    assert.match(migration, /alter table public\.projects alter column user_id set not null/);
    assert.match(migration, /alter table public\.applications alter column project_id set not null/);
  });

  it("creates an applicant profile from the auth user and blocks self-promotion", () => {
    assert.match(migration, /create trigger on_auth_user_created/);
    assert.match(migration, /'applicant'/);
    assert.match(migration, /profile role cannot be changed by the signed-in user/);
    assert.match(migration, /coalesce\(auth\.role\(\), ''\) = 'service_role'/);
    assert.doesNotMatch(migration, /raw_user_meta_data->>'role'/);
    assert.match(migration, /revoke all on public\.profiles from public, anon, authenticated/);
  });

  it("limits rows to the signed-in owner", () => {
    assert.match(migration, /policy profiles_select_own/);
    assert.match(migration, /policy projects_insert_own/);
    assert.match(migration, /policy projects_select_own/);
    assert.match(migration, /policy applications_select_own/);
    assert.doesNotMatch(migration, /using \(true\)/i);
    assert.match(migration, /p\.user_id = auth\.uid\(\)/);
  });

  it("does not seed demo people or projects", () => {
    assert.doesNotMatch(migration, /sharma/i);
    assert.doesNotMatch(migration, /ecofab/i);
    assert.doesNotMatch(migration, /insert into public\.projects/i);
    assert.doesNotMatch(migration, /insert into public\.applications/i);
  });
});
