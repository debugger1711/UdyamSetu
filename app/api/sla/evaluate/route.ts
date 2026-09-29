import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { evaluateDeadlineNotifications, evaluateRenewalNotifications } from "@/lib/notifications/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Manual entry point for a production scheduler. Page loads do not call this. */
export async function POST() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const deadlines = await evaluateDeadlineNotifications();
    const renewals = await evaluateRenewalNotifications();
    if (deadlines.status === 200 && renewals.status === 200) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Deadlines could not be evaluated." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
