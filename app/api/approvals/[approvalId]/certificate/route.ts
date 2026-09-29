import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { issueCertificateForApproval } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ approvalId: z.uuid() });

type RouteContext = { params: Promise<{ approvalId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }

    const { approvalId } = params.data;
    const result = await issueCertificateForApproval(approvalId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, certificateId: result.certificateId }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
