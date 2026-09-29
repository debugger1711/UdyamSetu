import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { submitOwnedApplication } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ applicationId: z.uuid() });

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const { applicationId } = paramsSchema.parse(await context.params);
    const result = await submitOwnedApplication(applicationId);
    if (result.status === 200) {
      return NextResponse.json({
        status: result.applicationStatus,
        workflows: result.workflows,
      });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "Only a draft application can be submitted." }, { status: 409 });
    }
    if (result.status === 422) {
      return NextResponse.json({ error: "The approval checklist is not ready to submit." }, { status: 422 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Application could not be submitted." }, { status: 503 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return authErrorResponse(error);
  }
}
