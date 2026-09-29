import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { escalateDepartmentGrievance } from "@/lib/grievances/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ grievanceId: z.uuid() });
const bodySchema = z.object({ reason: z.string().trim().min(1).max(1000) }).strict();

type RouteContext = { params: Promise<{ grievanceId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Grievance not found." }, { status: 404 });
    }
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const result = await escalateDepartmentGrievance(params.data.grievanceId, body.data.reason);
    if (result.status === 200) {
      return NextResponse.json({ escalationId: result.escalationId, status: "open" });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "No escalation path is configured." }, { status: 409 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Grievance not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Grievance could not be escalated." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
