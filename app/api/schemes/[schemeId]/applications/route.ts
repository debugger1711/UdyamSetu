import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { submitOwnSchemeClaim } from "@/lib/schemes/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ schemeId: z.uuid() });
const bodySchema = z.object({ projectId: z.uuid() }).strict();

type RouteContext = { params: Promise<{ schemeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
    }
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const result = await submitOwnSchemeClaim(params.data.schemeId, body.data.projectId);
    if (result.status === 201) {
      return NextResponse.json({ claimId: result.claimId, status: "submitted" }, { status: 201 });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "This scheme claim cannot be submitted." }, { status: 409 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Scheme claim could not be submitted." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
