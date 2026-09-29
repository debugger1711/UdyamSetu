import { NextResponse } from "next/server";
import { z } from "zod";

import { loadAnalytics } from "@/lib/analytics/records";
import type { AnalyticsTimeframe } from "@/lib/analytics/metrics";
import { authErrorResponse } from "@/lib/auth/http";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const timeframeSchema = z.enum(["monthly", "q3-2025", "ytd"]);

export async function GET(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Analytics is not available." }, { status: 503 });
  }

  const timeframe = new URL(request.url).searchParams.get("timeframe") ?? "q3-2025";
  const parsed = timeframeSchema.safeParse(timeframe);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await loadAnalytics(parsed.data as AnalyticsTimeframe);
    if (result.status === 200) {
      return NextResponse.json({
        scope: result.facts.scope,
        counts: result.facts,
        view: result.view,
      });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 401) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (result.status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ error: "Analytics is not available." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
