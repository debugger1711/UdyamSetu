import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import { registerOfficerRegistration } from "../lib/auth/credentials";
import { officerActivationSchema, signupSchema } from "../lib/auth/schemas";

const ROOT = path.resolve(import.meta.dirname, "..");

function source(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

describe("two-step signup", () => {
  it("asks for an account type and keeps the applicant payload free of a role or department", () => {
    const page = source("app/(auth)/signup/page.tsx");
    assert.match(page, /How do you want to use UdyamSetu\?/);
    assert.match(page, /Applicant/);
    assert.match(page, /Officer/);
    assert.match(page, /\/api\/auth\/signup/);
    assert.match(page, /\/api\/auth\/officer-registrations/);
    assert.match(page, /JSON\.stringify\(\{ email, password, fullName \}\)/);
    assert.doesNotMatch(page, /role/);
    assert.doesNotMatch(page, /departmentCode|"department"/);
    assert.doesNotMatch(page, /Sharma|EcoFab|Arjun|Rahul/);
  });

  it("rejects a client role or department on both signup bodies", () => {
    const fields = {
      email: "person@example.com",
      password: "long-password",
      fullName: "Person",
    };
    assert.throws(() => signupSchema.parse({ ...fields, role: "officer" }), ZodError);
    assert.throws(() => signupSchema.parse({ ...fields, department: "MPCB" }), ZodError);
    assert.throws(() => officerActivationSchema.parse({ ...fields, role: "officer", departmentCode: "MPCB" }), ZodError);
    assert.throws(() => officerActivationSchema.parse({ email: fields.email, department: "MPCB" }), ZodError);
  });

  it("records an officer request without putting a role in auth metadata", async () => {
    let metadata: unknown;
    const result = await registerOfficerRegistration({
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signUp: async (credentials) => {
          metadata = credentials.options?.data;
          return { data: { user: { id: "user-3" }, session: { access_token: "token" } }, error: null };
        },
        signOut: async () => ({ error: null }),
      },
    }, { email: "person@example.com", password: "long-password", fullName: "Person" });

    assert.deepEqual(result, { ok: true, userId: "user-3", needsEmailConfirmation: false });
    assert.deepEqual(metadata, { full_name: "Person", officer_registration: "true" });
    assert.equal(JSON.stringify(metadata).includes("role"), false);
  });

  it("keeps officer registration on the applicant signup schema and activation on an administrator", () => {
    const registration = source("app/api/auth/officer-registrations/route.ts");
    const activation = source("app/api/officer/registrations/activate/route.ts");
    assert.match(registration, /signupSchema/);
    assert.match(registration, /registerOfficerRegistration/);
    assert.match(registration, /role: "applicant"/);
    assert.match(registration, /officerRegistration: "pending"/);
    assert.doesNotMatch(registration, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient/);
    assert.match(activation, /requireAnyRole\(\["admin"\]\)/);
    assert.match(activation, /officerActivationSchema/);
    assert.match(activation, /activate_officer_registration/);
    assert.doesNotMatch(activation, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient/);
  });
});

describe("officer registration migration", () => {
  const migration = source("supabase/migrations/20260928320000_signup_officer_registration.sql");

  it("still creates an applicant and does not read a client role", () => {
    assert.match(migration, /'applicant'/);
    assert.match(migration, /officer_registration/);
    assert.doesNotMatch(migration, /raw_user_meta_data->>'role'/);
    assert.match(migration, /profile role cannot be changed by the signed-in user/);
    assert.match(migration, /current_user_role\(\) = 'admin'/);
    assert.match(migration, /officer activation is forbidden/);
    assert.doesNotMatch(migration, /for insert/);
    assert.doesNotMatch(migration, /Sharma|EcoFab|Arjun|Rahul/);
  });
});
