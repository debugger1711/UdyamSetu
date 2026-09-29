import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { recordDepartmentDecision } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ workflowId: z.uuid() });
const bodySchema = z
  .object({
    decision: z.enum(["granted", "rejected"]),
    remarks: z.string().trim().max(4000).optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ workflowId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid decision request." }, { status: 400 });
    }

    const { workflowId } = params.data;
    const { decision, remarks } = body.data;

    if (decision === "rejected" && (!remarks || remarks.trim().length < 5)) {
      return NextResponse.json(
        { error: "Meaningful rejection remarks (minimum 5 characters) are required." },
        { status: 400 },
      );
    }

    const result = await recordDepartmentDecision(workflowId, decision, remarks);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      workflowId: result.workflowId,
      approvalId: result.approvalId,
      decision: result.decision,
      alreadyDecided: result.alreadyDecided === true,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
