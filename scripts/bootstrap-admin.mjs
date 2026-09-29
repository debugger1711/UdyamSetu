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
  const adminEmail = process.argv[2] || "admin@udyamsetu.gov.in";
  const adminPassword = process.argv[3] || "AdminUdyam#2026";
  const fullName = "System Administrator";

  console.log(`Bootstrapping admin user: ${adminEmail}...`);

  // Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  let adminUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  if (!adminUser) {
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !createData.user) {
      console.error("Failed to create admin user:", createError);
      process.exit(1);
    }
    adminUser = createData.user;
    console.log(`Created auth user: ${adminUser.id}`);
  } else {
    console.log(`Auth user already exists: ${adminUser.id}`);
  }

  // Update profile role to 'admin' using service_role permissions
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin", full_name: fullName })
    .eq("id", adminUser.id);

  if (profileError) {
    console.error("Failed to elevate profile to admin:", profileError);
    process.exit(1);
  }

  console.log(`Successfully elevated ${adminEmail} (ID: ${adminUser.id}) to role 'admin'.`);
}

main().catch((err) => {
  console.error("Bootstrap script failed:", err);
  process.exit(1);
});
