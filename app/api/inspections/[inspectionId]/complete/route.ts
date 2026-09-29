import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { completeDepartmentInspection } from "@/lib/inspections/records";
import { queryText } from "@/lib/workflow/rules";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ inspectionId: z.uuid() });
const bodySchema = z.object({ body: z.string() }).strict();

type RouteContext = { params: Promise<{ inspectionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Inspection not found." }, { status: 404 });
    }
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const report = queryText(body.data.body);
    if (!report) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await completeDepartmentInspection(params.data.inspectionId, report);
    if (result.status === 200) {
      return NextResponse.json({ status: "completed" });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Inspection not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Inspection could not be completed." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
