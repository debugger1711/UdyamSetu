import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { queryText } from "@/lib/workflow/rules";
import { respondToOwnedQuery } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ queryId: z.uuid() });
const bodySchema = z.object({ body: z.string() }).strict();

type RouteContext = { params: Promise<{ queryId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Query not found." }, { status: 404 });
    }
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { queryId } = params.data;
    const answer = queryText(body.data.body);
    if (!answer) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await respondToOwnedQuery(queryId, answer);
    if (result.status === 200) {
      return NextResponse.json({ status: "responded" });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "This query is not open." }, { status: 409 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Query not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Response could not be stored." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
