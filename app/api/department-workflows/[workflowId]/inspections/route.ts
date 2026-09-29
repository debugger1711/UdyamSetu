import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { scheduleDepartmentInspection } from "@/lib/inspections/records";
import { parseScheduledAt } from "@/lib/sla/state";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ workflowId: z.uuid() });
const bodySchema = z.object({ scheduledAt: z.string() }).strict();

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
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const scheduledAt = parseScheduledAt(body.data.scheduledAt);
    if (!scheduledAt) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await scheduleDepartmentInspection(params.data.workflowId, scheduledAt);
    if (result.status === 201) {
      return NextResponse.json({ inspectionId: result.inspectionId, status: "assigned" }, { status: 201 });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "An active inspection already exists for this workflow." }, { status: 409 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Inspection could not be scheduled." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
