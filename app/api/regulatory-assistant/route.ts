import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { askGroundedQuestion } from "@/lib/knowledge/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000).optional(),
  query: z.string().trim().min(1).max(1000).optional(),
  applicationId: z.uuid().optional(),
}).strict();

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const query = body.data.question ?? body.data.query;
    if (!query) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const result = await askGroundedQuestion({
      query,
      applicationId: body.data.applicationId ?? null,
    });
    if (result.status === 200) {
      return NextResponse.json({
        success: true,
        source: "knowledge",
        grounded: true,
        answer: result.answer.headline,
        whyItMayApply: result.answer.whyItApplies,
        citations: result.answer.citations,
        sources: result.answer.citations,
        context: result.context,
        limitations: result.limitations,
        disclaimer: "Guidance only. Database facts and retrieved sources are separate. This answer does not decide an application.",
      });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "The question could not be answered." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
