import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { markAllOwnNotificationsRead } from "@/lib/notifications/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const result = await markAllOwnNotificationsRead();
    if (result.status === 200) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Notifications could not be updated." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
