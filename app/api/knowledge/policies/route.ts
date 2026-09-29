import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { requireAnyRole } from "@/lib/auth/session";
import { ingestOfficialPolicies } from "@/lib/knowledge/policy-corpus";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  scope: z.enum(["primary", "all"]),
}).strict();

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    await requireAnyRole(["officer", "admin"]);
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const supabase = await createClient();
    const ingested = await ingestOfficialPolicies(supabase, body.data.scope);
    if ("error" in ingested) {
      return NextResponse.json({ error: ingested.error }, { status: 503 });
    }
    return NextResponse.json({
      sourcePage: "https://industry.maharashtra.gov.in/en/services/policies",
      authority: ingested.registry.authority,
      department: ingested.registry.department,
      discovered: ingested.registry.policies.length,
      results: ingested.results,
    });
  } catch (error) {
    console.error("Official policy ingestion failed.", error instanceof Error ? error.message : "unknown");
    return authErrorResponse(error);
  }
}
