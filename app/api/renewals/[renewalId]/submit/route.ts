import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { submitOwnRenewal } from "@/lib/renewals/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ renewalId: z.uuid() });

type RouteContext = { params: Promise<{ renewalId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
    }
    const result = await submitOwnRenewal(params.data.renewalId);
    if (result.status === 200) return NextResponse.json({ status: "submitted" });
    if (result.status === 409) {
      return NextResponse.json({ error: "This certificate is not eligible for renewal." }, { status: 409 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Renewal could not be submitted." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
