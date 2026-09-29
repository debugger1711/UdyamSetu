/**
 * Checks if local development officer auto-activation is enabled.
 *
 * Local development/demo convenience only; production requires administrator authorization.
 */
export function isLocalOfficerAutoActivationEnabled(): boolean {
  // Production environments MUST NEVER permit automatic officer activation by default.
  // Administrator authorization is strictly required in production/staging.
  if (process.env.NODE_ENV === "production") {
    if (process.env.LOCAL_DEMO_AUTO_ACTIVATE === "true") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      return supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");
    }
    return false;
  }

  // Also verify that the database host is strictly localhost or 127.0.0.1
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isLocalHost = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");

  // Local development/demo convenience only; production requires administrator authorization.
  return isLocalHost;
}

/**
 * Automatically activates a newly registered officer for local development/demo.
 *
 * Local development/demo convenience only; production requires administrator authorization.
 */
export async function autoActivateOfficerForDemo(
  userId: string,
  email: string,
  departmentCode: string = process.env.DEMO_OFFICER_DEPARTMENT || "MPCB",
): Promise<boolean> {
  // Local development/demo convenience only; production requires administrator authorization.
  if (!isLocalOfficerAutoActivationEnabled()) {
    return false;
  }

  try {
    const { createAdminClient } = await import("../supabase/admin");
    const admin = createAdminClient();

    // 1. Fetch target department (defaults to MPCB for regulatory clearance scrutiny)
    const { data: department, error: dError } = await admin
      .from("departments")
      .select("id, code, name")
      .eq("code", departmentCode.trim())
      .maybeSingle();

    if (dError || !department) {
      console.error(`[Demo Auto-Activation] Department ${departmentCode} not found:`, dError);
      return false;
    }

    // 2. Elevate profile role to 'officer' (permitted under service_role)
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "officer" })
      .eq("id", userId);

    if (roleError) {
      console.error("[Demo Auto-Activation] Failed to update profile role:", roleError);
      return false;
    }

    // 3. Assign officer department in officer_departments
    const { error: deptError } = await admin
      .from("officer_departments")
      .upsert(
        { user_id: userId, department_id: department.id },
        { onConflict: "user_id,department_id" },
      );

    if (deptError) {
      console.error("[Demo Auto-Activation] Failed to assign department:", deptError);
      return false;
    }

    // 4. Update officer_registrations to active
    const { error: regError } = await admin
      .from("officer_registrations")
      .update({
        status: "active",
        department_id: department.id,
        activated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (regError) {
      console.error("[Demo Auto-Activation] Failed to update registration status:", regError);
      return false;
    }

    console.log(
      `[Demo Auto-Activation] Local development convenience: officer ${email} (${userId}) auto-activated in ${department.name} (${department.code}).`,
    );
    return true;
  } catch (error) {
    console.error("[Demo Auto-Activation] Unexpected error during auto-activation:", error);
    return false;
  }
}
