import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// Load .env.local
try {
  const envContent = readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = values.join("=").trim();
      }
    }
  }
} catch {
  // .env.local not found
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

class SessionClient {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.cookies = new Map();
  }

  _saveCookies(res) {
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (rawCookies.length === 0) {
      const single = res.headers.get("set-cookie");
      if (single) rawCookies.push(single);
    }
    for (const c of rawCookies) {
      const [nameVal] = c.split(";");
      const [name, ...val] = nameVal.split("=");
      this.cookies.set(name.trim(), val.join("=").trim());
    }
  }

  get cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async fetch(endpoint, options = {}) {
    const headers = {
      ...(options.headers || {}),
      Cookie: this.cookieHeader,
    };
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      redirect: "manual", // Do not auto-follow redirects so we can inspect redirect location
    });
    this._saveCookies(res);
    return res;
  }
}

async function main() {
  console.log("==================================================");
  console.log("TESTING LOCAL OFFICER AUTO-ACTIVATION DEMO FLOW");
  console.log("==================================================");

  const timestamp = Date.now();
  const testEmail = `officer.demo.${timestamp}@state.gov.in`;
  const testPassword = `DemoOfficer#${timestamp}`;
  const testFullName = `Dr. Demo Officer ${timestamp}`;

  console.log(`\n1. Registering NEW officer account via /api/auth/officer-registrations...`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Name:  ${testFullName}`);

  const regRes = await fetch(`${BASE_URL}/api/auth/officer-registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      fullName: testFullName,
    }),
  });

  assert.equal(regRes.status, 200, `Registration failed with status ${regRes.status}`);
  const regData = await regRes.json();
  console.log("✔ Registration response:", regData);

  assert.ok(regData.userId, "Must return a userId");
  assert.equal(regData.role, "officer", "Role must be immediately 'officer' in local dev");
  assert.equal(regData.officerRegistration, "active", "officerRegistration must be immediately 'active'");
  assert.equal(regData.autoActivated, true, "autoActivated must be true in local dev");

  console.log("\n2. Verifying database state directly via PostgreSQL...");
  // Check auth user exists
  const { data: authUser } = await adminClient.auth.admin.getUserById(regData.userId);
  assert.ok(authUser.user, "Auth user must exist in auth.users");
  console.log(`✔ Real auth user confirmed: ${authUser.user.id} (${authUser.user.email})`);

  // Check profiles row
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", regData.userId)
    .single();

  console.log("✔ Profiles row in database:", profile);
  assert.equal(profile.role, "officer", "profiles.role must be 'officer'");
  assert.equal(profile.email, testEmail.toLowerCase());

  // Check officer_departments row
  const { data: officerDept } = await adminClient
    .from("officer_departments")
    .select("department_id, departments(code, name)")
    .eq("user_id", regData.userId)
    .single();

  console.log("✔ Officer department assignment in database:", officerDept);
  assert.ok(officerDept, "Must have an officer_departments record");
  assert.equal(officerDept.departments.code, "MPCB", "Must be assigned to MPCB demo department");

  // Check officer_registrations row
  const { data: officerReg } = await adminClient
    .from("officer_registrations")
    .select("status, department_id, activated_at")
    .eq("user_id", regData.userId)
    .single();

  console.log("✔ Officer registration in database:", officerReg);
  assert.equal(officerReg.status, "active", "officer_registrations.status must be 'active'");
  assert.ok(officerReg.activated_at, "activated_at must be populated");

  console.log("\n3. Testing Officer Login via /api/auth/login...");
  const session = new SessionClient(testEmail, testPassword);
  const loginRes = await session.fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  assert.equal(loginRes.status, 200, `Login failed with status ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log("✔ Login successful:", loginData);
  assert.equal(loginData.role, "officer", "Login response role must be 'officer'");

  console.log("\n4. Testing Officer Dashboard Access (/officer-dashboard)...");
  const dashRes = await session.fetch("/officer-dashboard");
  console.log(`   GET /officer-dashboard HTTP Status: ${dashRes.status}`);
  // In Next.js, a 200 means access allowed; a 307/302 redirect location would mean redirect to /dashboard
  if (dashRes.status === 307 || dashRes.status === 302) {
    const loc = dashRes.headers.get("location");
    console.error(`   REDIRECTED TO: ${loc}`);
    assert.fail(`Officer was redirected to ${loc} instead of accessing /officer-dashboard!`);
  }
  assert.equal(dashRes.status, 200, "Must return HTTP 200 without redirect");
  const dashText = await dashRes.text();
  assert.ok(dashText.includes("Command Center") || dashText.includes("Queue") || dashText.includes("Officer"), "Must render officer dashboard");
  console.log("✔ Officer dashboard loaded successfully (no applicant redirect!)");

  console.log("\n5. Testing Officer Applications Queue (/officer-applications)...");
  const appQueueRes = await session.fetch("/officer-applications");
  assert.equal(appQueueRes.status, 200, "Officer applications queue must return HTTP 200");
  console.log("✔ Officer applications queue loaded successfully");

  console.log("\n==================================================");
  console.log("ALL FRESH DEMO FLOW VERIFICATION CHECKS PASSED!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
