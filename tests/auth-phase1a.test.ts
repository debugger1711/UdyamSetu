import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import {
  canAccessApplication,
  canAccessOwnedRow,
  decideRouteAccess,
  isRoleAllowed,
  roleAssignedAtSignup,
} from "../lib/auth/access";
import { registerApplicant, signInWithPassword, signOut } from "../lib/auth/credentials";
import { createOwnedProjectSchema, loginSchema, signupSchema } from "../lib/auth/schemas";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("route authorization", () => {
  it("sends an unauthenticated visitor away from protected pages", () => {
    assert.deepEqual(decideRouteAccess("/dashboard", null), { type: "redirect", to: "/login" });
    assert.deepEqual(decideRouteAccess("/officer-dashboard", null), {
      type: "redirect",
      to: "/login",
    });
    assert.deepEqual(decideRouteAccess("/projects/new", null), { type: "redirect", to: "/login" });
    assert.deepEqual(decideRouteAccess("/", null), { type: "allow" });
    assert.deepEqual(decideRouteAccess("/api/health", null), { type: "allow" });
    assert.deepEqual(decideRouteAccess("/login", null), { type: "allow" });
  });

  it("keeps an applicant out of officer pages", () => {
    assert.deepEqual(decideRouteAccess("/officer-dashboard", "applicant"), {
      type: "redirect",
      to: "/dashboard",
    });
    assert.deepEqual(decideRouteAccess("/officer-applications/abc", "applicant"), {
      type: "redirect",
      to: "/dashboard",
    });
    assert.equal(decideRouteAccess("/dashboard", "applicant").type, "allow");
    assert.equal(isRoleAllowed("applicant", ["officer", "admin"]), false);
  });

  it("keeps an officer out of applicant pages and allows officer pages", () => {
    assert.deepEqual(decideRouteAccess("/dashboard", "officer"), {
      type: "redirect",
      to: "/officer-dashboard",
    });
    assert.equal(decideRouteAccess("/officer-dashboard", "officer").type, "allow");
    assert.equal(isRoleAllowed("officer", ["officer", "admin"]), true);
    assert.equal(isRoleAllowed("admin", ["officer", "admin"]), true);
  });

  it("allows a provisioned admin into both areas", () => {
    assert.equal(decideRouteAccess("/dashboard", "admin").type, "allow");
    assert.equal(decideRouteAccess("/officer-dashboard", "admin").type, "allow");
  });
});

describe("ownership", () => {
  it("lets a user open only their own project", () => {
    assert.equal(canAccessOwnedRow("user-a", "user-a"), true);
    assert.equal(canAccessOwnedRow("user-b", "user-a"), false);
    assert.equal(canAccessOwnedRow(null, "user-a"), false);
  });

  it("follows project ownership for an application", () => {
    assert.equal(canAccessApplication("user-a", "user-a"), true);
    assert.equal(canAccessApplication("user-b", "user-a"), false);
  });
});

describe("role security", () => {
  it("does not trust a role sent by the client at signup", () => {
    assert.equal(roleAssignedAtSignup(), "applicant");
    assert.throws(() => signupSchema.parse({
      email: "person@example.com",
      password: "long-password",
      fullName: "Person",
      role: "officer",
    }), ZodError);
  });

  it("does not accept a role or owner id on a project write", () => {
    assert.throws(() => createOwnedProjectSchema.parse({
      name: "Unit",
      sector: "Electronics",
      totalInvestmentCr: 1,
      location: "Plot 1",
      userId: "someone-else",
    }), ZodError);
  });
});

describe("credentials", () => {
  it("rejects missing login fields before a password check", () => {
    assert.throws(() => loginSchema.parse({ email: "", password: "" }), ZodError);
    assert.throws(() => loginSchema.parse({ email: "person@example.com" }), ZodError);
  });

  it("maps an invalid password response to invalid credentials", async () => {
    const result = await signInWithPassword({
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: { message: "bad" } }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
    }, "person@example.com", "wrong-password");

    assert.deepEqual(result, { ok: false, code: "invalid_credentials" });
  });

  it("returns the authenticated user id without a client-supplied role", async () => {
    let metadata: unknown;
    const result = await signInWithPassword({
      auth: {
        signInWithPassword: async () => ({ data: { user: { id: "user-1" } }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
    }, "person@example.com", "correct-password");

    const signup = await registerApplicant({
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signUp: async (credentials) => {
          metadata = credentials.options?.data;
          return { data: { user: { id: "user-2" }, session: { access_token: "token" } }, error: null };
        },
        signOut: async () => ({ error: null }),
      },
    }, { email: "person@example.com", password: "correct-password", fullName: "Person" });

    assert.deepEqual(result, { ok: true, userId: "user-1" });
    assert.deepEqual(signup, { ok: true, userId: "user-2", needsEmailConfirmation: false });
    assert.deepEqual(metadata, { full_name: "Person" });
  });

  it("signs out through the auth client", async () => {
    let signedOut = false;
    await signOut({
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => {
          signedOut = true;
          return { error: null };
        },
      },
    });
    assert.equal(signedOut, true);
  });
});

describe("auth source boundaries", () => {
  it("keeps identity helpers off demo storage and the service role", () => {
    const files = [
      "lib/auth/access.ts",
      "lib/auth/credentials.ts",
      "lib/auth/session.ts",
      "lib/auth/schemas.ts",
      "app/api/auth/login/route.ts",
      "app/api/auth/signup/route.ts",
      "app/api/projects/route.ts",
      "app/(auth)/login/page.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      assert.equal(source.includes("udyamsetu_demo_state_v2"), false, file);
      assert.equal(source.includes("localStorage"), false, file);
      assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false, file);
      assert.equal(source.includes("@/lib/supabase/admin"), false, file);
    }
  });
});
