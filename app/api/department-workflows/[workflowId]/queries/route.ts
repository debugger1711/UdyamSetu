import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { queryText } from "@/lib/workflow/rules";
import { raiseDepartmentQuery } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ workflowId: z.uuid() });
const bodySchema = z.object({ body: z.string() }).strict();

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
    const { workflowId } = params.data;
    const question = queryText(body.data.body);
    if (!question) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await raiseDepartmentQuery(workflowId, question);
    if (result.status === 201) {
      return NextResponse.json({ queryId: result.queryId, status: "open" }, { status: 201 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Query could not be created." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
