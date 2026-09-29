import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { listOwnNotifications } from "@/lib/notifications/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const result = await listOwnNotifications();
    if (!result.ok) {
      return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 503 });
    }
    return NextResponse.json({ notifications: result.data, unread: result.unread });
  } catch (error) {
    return authErrorResponse(error);
  }
}
