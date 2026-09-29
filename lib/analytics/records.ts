import "server-only";

import { requireUser } from "@/lib/auth/session";
import {
  analyticsRange,
  presentAnalytics,
  previousRange,
  readAnalyticsFacts,
  type AnalyticsFacts,
  type AnalyticsTimeframe,
  type AnalyticsView,
} from "@/lib/analytics/metrics";
import { createClient } from "@/lib/supabase/server";

function analyticsStatus(message: string): 400 | 401 | 403 | 503 {
  if (message.includes("invalid analytics range")) return 400;
  if (message.includes("authentication required")) return 401;
  if (message.includes("analytics is not available")) return 403;
  return 503;
}

export async function loadAnalytics(timeframe: AnalyticsTimeframe, now = new Date()): Promise<
  { status: 200; facts: AnalyticsFacts; previous: AnalyticsFacts; view: AnalyticsView }
  | { status: 400 | 401 | 403 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const range = analyticsRange(timeframe, now);
  const earlier = previousRange(range);
  const [current, previous] = await Promise.all([
    supabase.rpc("analytics_snapshot", { p_start: range.start.toISOString(), p_end: range.end.toISOString() }),
    supabase.rpc("analytics_snapshot", { p_start: earlier.start.toISOString(), p_end: earlier.end.toISOString() }),
  ]);
  if (current.error || previous.error) {
    return { status: analyticsStatus(`${current.error?.message ?? ""} ${previous.error?.message ?? ""}`) };
  }
  try {
    const facts = readAnalyticsFacts(current.data);
    const previousFacts = readAnalyticsFacts(previous.data);
    return {
      status: 200,
      facts,
      previous: previousFacts,
      view: presentAnalytics({ current: facts, previous: previousFacts, now }),
    };
  } catch {
    return { status: 503 };
  }
}
