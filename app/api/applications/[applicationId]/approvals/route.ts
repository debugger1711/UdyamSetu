import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { generateOwnedApprovals } from "@/lib/approvals/queries";
import { authErrorResponse } from "@/lib/auth/http";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ applicationId: z.uuid() });

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const { applicationId } = parseWithSchema(paramsSchema, await context.params);
    const result = await generateOwnedApprovals(applicationId);
    if (result.status === 200) {
      return NextResponse.json({
        ok: true,
        codes: result.codes,
        inserted: result.inserted,
      });
    }
    if (result.status === 422) {
      return NextResponse.json({
        ok: false,
        code: "INSUFFICIENT_PROJECT_INFORMATION",
        missing: result.missing,
      }, { status: 422 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Approvals could not be generated." }, { status: 503 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return authErrorResponse(error);
  }
}
