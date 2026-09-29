import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { markOwnNotificationRead } from "@/lib/notifications/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ notificationId: z.uuid() });

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    const result = await markOwnNotificationRead(params.data.notificationId);
    if (result.status === 200) return NextResponse.json({ ok: true });
    if (result.status === 404) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Notification could not be updated." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
