import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { createOwnRenewal } from "@/lib/renewals/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ certificateId: z.uuid() });

type RouteContext = { params: Promise<{ certificateId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }
    const result = await createOwnRenewal(params.data.certificateId);
    if (result.status === 201) {
      return NextResponse.json({ renewalId: result.renewalId, status: "due" }, { status: 201 });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "This certificate is not eligible for renewal." }, { status: 409 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Renewal could not be created." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
