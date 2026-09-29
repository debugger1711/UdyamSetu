import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { officerActivationSchema } from "@/lib/auth/schemas";
import { requireAnyRole } from "@/lib/auth/session";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    await requireAnyRole(["admin"]);
    const body: unknown = await request.json();
    const input = parseWithSchema(officerActivationSchema, body);
    const supabase = await createClient();
    const { error } = await supabase.rpc("activate_officer_registration", {
      target_email: input.email,
      department_code: input.departmentCode,
    });

    if (error) {
      const message = error.message;
      if (message.includes("forbidden")) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      if (message.includes("not pending")) {
        return NextResponse.json({ error: "Officer registration is not pending." }, { status: 409 });
      }
      if (message.includes("department")) {
        return NextResponse.json({ error: "Department is not recorded." }, { status: 400 });
      }
      return NextResponse.json({ error: "Activation failed." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, officerRegistration: "active" });
  } catch (error) {
    return authErrorResponse(error);
  }
}
