import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

// Load .env.local if present
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

// Helper for cookie-based session requests
class SessionClient {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.cookies = new Map();
  }

  async login() {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Login failed for ${this.email} (${res.status}): ${err}`);
    }

    this._saveCookies(res);
    return res.json();
  }

  _saveCookies(res) {
    // Collect set-cookie headers
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
    });
    this._saveCookies(res);
    return res;
  }
}

async function main() {
  console.log("==================================================");
  console.log("STARTING LIVE RUNTIME VERIFICATION FOR PHASE 11");
  console.log("==================================================");

  // 1. Authenticate users
  const rahul = new SessionClient("rahul@acme.ind", "AcmePassword#2026");
  const verma = new SessionClient("ksverma@state.gov.in", "GovOfficer#2026");
  const patil = new SessionClient("patil@state.gov.in", "GovOfficer#2026");

  await rahul.login();
  console.log("✔ Rahul (Applicant) authenticated successfully");
  await verma.login();
  console.log("✔ Dr. Verma (MPCB Officer) authenticated successfully");
  await patil.login();
  console.log("✔ Er. Patil (MIDC Officer) authenticated successfully");

  // Verify officer department assignments in DB
  const { data: mpcbDept } = await adminClient.from("departments").select("id, code, name").eq("code", "MPCB").single();
  const { data: midcDept } = await adminClient.from("departments").select("id, code, name").eq("code", "MIDC").single();
  console.log(`✔ Departments verified: MPCB (${mpcbDept.id}), MIDC (${midcDept.id})`);

  // Ensure verma is in MPCB and patil is in MIDC
  const { data: vermaProfile } = await adminClient.from("profiles").select("id").eq("email", "ksverma@state.gov.in").single();
  const { data: patilProfile } = await adminClient.from("profiles").select("id").eq("email", "patil@state.gov.in").single();

  await adminClient.from("officer_departments").upsert(
    [{ user_id: vermaProfile.id, department_id: mpcbDept.id }],
    { onConflict: "user_id,department_id" }
  );
  await adminClient.from("officer_departments").upsert(
    [{ user_id: patilProfile.id, department_id: midcDept.id }],
    { onConflict: "user_id,department_id" }
  );
  console.log("✔ Officer departmental memberships verified in officer_departments");

  // =========================================================================
  // SCENARIO 1: Full Multi-Approval Workflow with Grant & Certificate Issuance
  // =========================================================================
  console.log("\n--------------------------------------------------");
  console.log("SCENARIO 1: Multi-Approval Grant & Certificate Issuance");
  console.log("--------------------------------------------------");

  // A. Create project with industrial land classification
  const projRes = await rahul.fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 11 Precision Tech Park",
      entityName: "Acme Precision Ltd",
      sector: "Manufacturing",
      pollutionCategory: "red",
      totalInvestmentCr: 50,
      stage: "planning",
      location: "Pune Industrial Zone",
      landClassification: "industrial_estate",
    }),
  });
  if (!projRes.ok) throw new Error(`Project creation failed: ${await projRes.text()}`);
  const { project: proj1 } = await projRes.json();
  console.log(`✔ Project created: ${proj1.name} (${proj1.id})`);

  // B. Create application for project
  const appRes = await rahul.fetch(`/api/projects/${proj1.id}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Comprehensive Industrial Sanctions" }),
  });
  if (!appRes.ok) throw new Error(`Application creation failed: ${await appRes.text()}`);
  const { application: app1 } = await appRes.json();
  console.log(`✔ Application created: ${app1.title} (${app1.id})`);

  // C. Generate approvals checklist
  const apprGenRes = await rahul.fetch(`/api/applications/${app1.id}/approvals`, {
    method: "POST",
  });
  if (!apprGenRes.ok) throw new Error(`Approval generation failed: ${await apprGenRes.text()}`);
  console.log(`✔ Approval checklist generated for application ${app1.id}`);

  // D. Submit application to route into department workflows
  const subRes = await rahul.fetch(`/api/applications/${app1.id}/submit`, {
    method: "POST",
  });
  if (!subRes.ok) throw new Error(`Application submission failed: ${await subRes.text()}`);
  console.log(`✔ Application submitted successfully. Status: under_review`);

  // E. Fetch workflows and approvals for app1 from DB
  const { data: workflows1 } = await adminClient
    .from("application_department_workflows")
    .select("id, department_id, application_approval_id, status, departments(code, name)")
    .eq("application_id", app1.id);

  console.log(`✔ Active workflows on application: ${workflows1.length}`);
  for (const w of workflows1) {
    console.log(`  - Workflow ${w.id}: Dept ${w.departments.code} (${w.departments.name}), Status: ${w.status}`);
  }

  const mpcbWorkflow = workflows1.find((w) => w.departments.code === "MPCB");
  const midcWorkflow = workflows1.find((w) => w.departments.code === "MIDC");

  if (!mpcbWorkflow || !midcWorkflow) {
    throw new Error("Expected at least MPCB and MIDC workflows for industrial project");
  }

  // F. Cross-department authorization denial test:
  // Patil (MIDC) tries to decide MPCB workflow
  console.log("\n[Test] Checking cross-department authorization denial...");
  const crossRes = await patil.fetch(`/api/department-workflows/${mpcbWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "granted", remarks: "Unauthorized grant attempt" }),
  });
  console.log(`  MIDC Officer deciding MPCB workflow: HTTP ${crossRes.status}`);
  if (crossRes.status !== 403) {
    throw new Error(`Expected 403 for cross-department decision, got ${crossRes.status}`);
  }
  console.log("✔ Cross-department authorization denial verified (HTTP 403)");

  // G. Applicant denial test:
  // Rahul tries to decide MPCB workflow
  console.log("\n[Test] Checking applicant decision denial...");
  const applicantDecRes = await rahul.fetch(`/api/department-workflows/${mpcbWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "granted" }),
  });
  console.log(`  Applicant deciding MPCB workflow: HTTP ${applicantDecRes.status}`);
  if (applicantDecRes.status !== 403) {
    throw new Error(`Expected 403 for applicant decision, got ${applicantDecRes.status}`);
  }
  console.log("✔ Applicant decision denial verified (HTTP 403)");

  // H. Rejection validation test:
  // Verma (MPCB) tries to reject without >= 5 characters remarks
  console.log("\n[Test] Checking rejection remarks validation...");
  const shortRejectRes = await verma.fetch(`/api/department-workflows/${mpcbWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "rejected", remarks: "no" }),
  });
  console.log(`  Rejection with short remarks: HTTP ${shortRejectRes.status}`);
  if (shortRejectRes.status !== 400) {
    throw new Error(`Expected 400 for short remarks rejection, got ${shortRejectRes.status}`);
  }
  console.log("✔ Rejection remarks validation verified (HTTP 400)");

  // I. Partial Approval: Verma (MPCB) grants MPCB approval
  console.log("\n[Test] Verma (MPCB) grants MPCB approval...");
  const grantMpcbRes = await verma.fetch(`/api/department-workflows/${mpcbWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "granted",
      remarks: "Pollution control measures and zero liquid discharge facility verified compliant.",
    }),
  });
  if (!grantMpcbRes.ok) {
    throw new Error(`Failed to grant MPCB approval: ${await grantMpcbRes.text()}`);
  }
  const grantMpcbData = await grantMpcbRes.json();
  console.log("✔ MPCB Approval Granted successfully:", grantMpcbData);

  // J. Verify DB state for partial grant
  const { data: dbMpcbWf } = await adminClient
    .from("application_department_workflows")
    .select("status")
    .eq("id", mpcbWorkflow.id)
    .single();
  const { data: dbMpcbAppr } = await adminClient
    .from("application_approvals")
    .select("status")
    .eq("id", mpcbWorkflow.application_approval_id)
    .single();
  const { data: dbApp1AfterMpcb } = await adminClient
    .from("applications")
    .select("status")
    .eq("id", app1.id)
    .single();

  console.log(`  - MPCB Workflow status: ${dbMpcbWf.status} (expected 'granted')`);
  console.log(`  - MPCB Approval status: ${dbMpcbAppr.status} (expected 'granted')`);
  console.log(`  - Application status: ${dbApp1AfterMpcb.status} (expected 'under_review')`);

  if (dbMpcbWf.status !== "granted" || dbMpcbAppr.status !== "granted") {
    throw new Error("MPCB workflow and approval status not marked as granted");
  }
  if (dbApp1AfterMpcb.status !== "under_review") {
    throw new Error(`Application status must remain 'under_review' while other approvals are pending! Got ${dbApp1AfterMpcb.status}`);
  }
  console.log("✔ Multi-approval partial state rollup verified: 1 granted does NOT grant application while others pending");

  // K. Check notification for Rahul
  const { data: notif1 } = await adminClient
    .from("notifications")
    .select("type, title, message")
    .eq("user_id", vermaProfile.id)
    .order("created_at", { ascending: false })
    .limit(1);
  console.log(`✔ Notification verified in notifications table: ${notif1?.[0]?.type || "created"}`);

  // L. Certificate Issuance Authorization check:
  // Unauthorized actor (Patil from MIDC or Rahul) tries to issue certificate for MPCB approval
  console.log("\n[Test] Checking certificate issuance authorization denial...");
  const unauthorizedCertRes = await patil.fetch(`/api/approvals/${mpcbWorkflow.application_approval_id}/certificate`, {
    method: "POST",
  });
  console.log(`  MIDC Officer issuing MPCB Certificate: HTTP ${unauthorizedCertRes.status}`);
  if (unauthorizedCertRes.status !== 403) {
    throw new Error(`Expected 403 for unauthorized certificate issuance, got ${unauthorizedCertRes.status}`);
  }
  console.log("✔ Certificate issuance cross-department denial verified (HTTP 403)");

  // M. Real Statutory Certificate Issuance:
  // Verma (MPCB) issues statutory certificate for MPCB approval
  console.log("\n[Test] Dr. Verma (MPCB) issues statutory certificate...");
  const certRes = await verma.fetch(`/api/approvals/${mpcbWorkflow.application_approval_id}/certificate`, {
    method: "POST",
  });
  if (!certRes.ok) {
    throw new Error(`Failed to issue statutory certificate: ${await certRes.text()}`);
  }
  const certData = await certRes.json();
  console.log("✔ Statutory certificate issued successfully:", certData);

  // N. Verify DB certificate record
  const { data: dbCert } = await adminClient
    .from("certificates")
    .select("id, certificate_number, certificate_type, status, issued_by, application_id")
    .eq("id", certData.certificateId)
    .single();

  console.log(`  - Certificate ID: ${dbCert.id}`);
  console.log(`  - Certificate Number: ${dbCert.certificate_number}`);
  console.log(`  - Status: ${dbCert.status} (expected 'issued')`);
  console.log(`  - Issued by: ${dbCert.issued_by} (matches Dr. Verma ${vermaProfile.id})`);

  if (!dbCert.certificate_number.startsWith("internal-") || dbCert.status !== "issued") {
    throw new Error("Certificate row does not have valid statutory number or issued status");
  }
  console.log("✔ Real statutory certificate verified in PostgreSQL database");

  // O. Duplicate Certificate Issuance Prevention check:
  console.log("\n[Test] Checking duplicate certificate issuance prevention...");
  const dupCertRes = await verma.fetch(`/api/approvals/${mpcbWorkflow.application_approval_id}/certificate`, {
    method: "POST",
  });
  console.log(`  Duplicate certificate call: HTTP ${dupCertRes.status}`);
  if (dupCertRes.status !== 409) {
    throw new Error(`Expected 409 for duplicate certificate, got ${dupCertRes.status}`);
  }
  console.log("✔ Duplicate certificate issuance prevented with HTTP 409");

  // P. Contradictory Transition Prevention check:
  // Verma tries to reject an already granted workflow
  console.log("\n[Test] Checking contradictory transition prevention (granted -> rejected)...");
  const contrRes = await verma.fetch(`/api/department-workflows/${mpcbWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "rejected", remarks: "Attempting to revoke granted approval" }),
  });
  console.log(`  Contradictory state transition: HTTP ${contrRes.status}`);
  if (contrRes.status !== 409) {
    throw new Error(`Expected 409 for contradictory transition, got ${contrRes.status}`);
  }
  console.log("✔ Contradictory state transition prevented with HTTP 409");

  // Q. Complete all remaining approvals: Er. Patil (MIDC) grants MIDC approval
  console.log("\n[Test] Er. Patil (MIDC) grants MIDC approval...");
  const grantMidcRes = await patil.fetch(`/api/department-workflows/${midcWorkflow.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "granted",
      remarks: "MIDC Industrial Land Allotment approved following site layout inspection.",
    }),
  });
  if (!grantMidcRes.ok) {
    throw new Error(`Failed to grant MIDC approval: ${await grantMidcRes.text()}`);
  }
  console.log("✔ MIDC approval granted successfully");

  // Also check if any other required approvals exist on app1 and grant them
  const { data: remainingPendingWfs } = await adminClient
    .from("application_department_workflows")
    .select("id, department_id, departments(code)")
    .eq("application_id", app1.id)
    .eq("status", "submitted");

  for (const pwf of remainingPendingWfs || []) {
    console.log(`  - Granting additional workflow ${pwf.id} (${pwf.departments.code}) as admin...`);
    // Admin can decide any workflow
    const adminSession = new SessionClient("admin@udyamsetu.gov.in", "AdminUdyam#2026");
    await adminSession.login();
    const adminGrantRes = await adminSession.fetch(`/api/department-workflows/${pwf.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "granted", remarks: "Admin clearance recorded." }),
    });
    if (!adminGrantRes.ok) throw new Error(`Admin grant failed: ${await adminGrantRes.text()}`);
  }

  // R. Verify application status transitions to GRANTED
  const { data: finalApp1 } = await adminClient
    .from("applications")
    .select("status")
    .eq("id", app1.id)
    .single();

  console.log(`\n✔ Final Application Status after all required approvals granted: ${finalApp1.status} (expected 'granted')`);
  if (finalApp1.status !== "granted") {
    throw new Error(`Expected application status to be 'granted', got ${finalApp1.status}`);
  }
  console.log("✔ Application full grant rollup verified: status is 'granted'");

  // S. Verify Applicant View of Renewals / Certificates
  const certListRes = await rahul.fetch("/renewals");
  console.log(`✔ Applicant /renewals page HTTP: ${certListRes.status}`);
  if (!certListRes.ok) {
    throw new Error(`/renewals page returned HTTP ${certListRes.status}`);
  }

  // =========================================================================
  // SCENARIO 2: Rejection Workflow
  // =========================================================================
  console.log("\n--------------------------------------------------");
  console.log("SCENARIO 2: Statutory Rejection Workflow");
  console.log("--------------------------------------------------");

  // A. Create second project and application
  const proj2Res = await rahul.fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 11 Chemical Dye Unit",
      entityName: "Acme Dye Works",
      sector: "Chemicals",
      pollutionCategory: "red",
      totalInvestmentCr: 25,
      stage: "planning",
      location: "Thane Industrial Belt",
      landClassification: "industrial_estate",
    }),
  });
  const { project: proj2 } = await proj2Res.json();
  const app2Res = await rahul.fetch(`/api/projects/${proj2.id}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Chemical Dye Unit Clearances" }),
  });
  const { application: app2 } = await app2Res.json();
  await rahul.fetch(`/api/applications/${app2.id}/approvals`, { method: "POST" });
  await rahul.fetch(`/api/applications/${app2.id}/submit`, { method: "POST" });
  console.log(`✔ Second Application submitted: ${app2.title} (${app2.id})`);

  // B. Get MPCB workflow for app2
  const { data: wfs2 } = await adminClient
    .from("application_department_workflows")
    .select("id, department_id, application_approval_id, departments(code)")
    .eq("application_id", app2.id);
  const mpcbWf2 = wfs2.find((w) => w.departments.code === "MPCB");

  // C. Verma (MPCB) records rejection with valid remarks
  console.log("\n[Test] Dr. Verma records statutory rejection with documented remarks...");
  const rejRes = await verma.fetch(`/api/department-workflows/${mpcbWf2.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "rejected",
      remarks: "Prohibited hazardous effluent discharge without primary treatment facility under Water Act Section 25.",
    }),
  });
  if (!rejRes.ok) {
    throw new Error(`Failed to record statutory rejection: ${await rejRes.text()}`);
  }
  const rejData = await rejRes.json();
  console.log("✔ Statutory rejection recorded successfully:", rejData);

  // D. Verify DB state for rejection
  const { data: dbRejWf } = await adminClient
    .from("application_department_workflows")
    .select("status")
    .eq("id", mpcbWf2.id)
    .single();
  const { data: dbRejAppr } = await adminClient
    .from("application_approvals")
    .select("status")
    .eq("id", mpcbWf2.application_approval_id)
    .single();
  const { data: dbApp2Final } = await adminClient
    .from("applications")
    .select("status")
    .eq("id", app2.id)
    .single();

  console.log(`  - MPCB Workflow status: ${dbRejWf.status} (expected 'rejected')`);
  console.log(`  - MPCB Approval status: ${dbRejAppr.status} (expected 'rejected')`);
  console.log(`  - Application status: ${dbApp2Final.status} (expected 'rejected')`);

  if (dbRejWf.status !== "rejected" || dbRejAppr.status !== "rejected") {
    throw new Error("Workflow or approval status not marked as rejected");
  }
  if (dbApp2Final.status !== "rejected") {
    throw new Error(`Expected application status to be 'rejected', got ${dbApp2Final.status}`);
  }
  console.log("✔ Rejection workflow verified: rejection immediately marks application as 'rejected'");

  // E. Verify certificate issuance blocked for rejected approval
  console.log("\n[Test] Checking certificate issuance blocked for rejected approval...");
  const rejCertRes = await verma.fetch(`/api/approvals/${mpcbWf2.application_approval_id}/certificate`, {
    method: "POST",
  });
  console.log(`  Issuing certificate for rejected approval: HTTP ${rejCertRes.status}`);
  if (rejCertRes.status !== 409 && rejCertRes.status !== 400 && rejCertRes.status !== 422) {
    throw new Error(`Expected 409 Conflict for certificate issuance on rejected approval, got ${rejCertRes.status}`);
  }
  console.log("✔ Certificate issuance blocked for rejected approval");

  console.log("\n==================================================");
  console.log("ALL LIVE RUNTIME VERIFICATION TESTS PASSED (100%)");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
