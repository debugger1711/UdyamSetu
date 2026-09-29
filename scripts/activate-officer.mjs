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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  const targetEmail = process.argv[2];
  const departmentCode = process.argv[3] || "MPCB";

  if (!targetEmail) {
    console.error("Usage: npm run admin:activate <officer-email> [department-code]");
    process.exit(1);
  }

  console.log(`Activating officer ${targetEmail} for department ${departmentCode}...`);

  // 1. Find profile
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", targetEmail.trim())
    .maybeSingle();

  if (pError || !profile) {
    console.error(`Profile not found for email ${targetEmail}:`, pError);
    process.exit(1);
  }

  // 2. Find department
  const { data: department, error: dError } = await supabase
    .from("departments")
    .select("id, code, name")
    .eq("code", departmentCode.trim())
    .maybeSingle();

  if (dError || !department) {
    console.error(`Department ${departmentCode} not found:`, dError);
    process.exit(1);
  }

  // 3. Update profile role to 'officer' (allowed under service_role)
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "officer" })
    .eq("id", profile.id);

  if (roleError) {
    console.error("Failed to update profile role:", roleError);
    process.exit(1);
  }

  // 4. Assign department
  const { error: deptError } = await supabase
    .from("officer_departments")
    .upsert({ user_id: profile.id, department_id: department.id }, { onConflict: "user_id,department_id" });

  if (deptError) {
    console.error("Failed to assign officer department:", deptError);
    process.exit(1);
  }

  // 5. Update officer registration status
  const { error: regError } = await supabase
    .from("officer_registrations")
    .update({
      status: "active",
      department_id: department.id,
      activated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  if (regError) {
    console.error("Failed to update registration status:", regError);
    process.exit(1);
  }

  console.log(`Successfully activated officer ${targetEmail} in ${department.name} (${department.code})!`);
}

main().catch((err) => {
  console.error("Officer activation script error:", err);
  process.exit(1);
});
