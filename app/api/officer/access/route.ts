import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { requireAnyRole } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Confirms the caller is an officer or admin. It does not load department work. */
export async function GET() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const profile = await requireAnyRole(["officer", "admin"]);
    return NextResponse.json({ ok: true, role: profile.role });
  } catch (error) {
    return authErrorResponse(error);
  }
}
