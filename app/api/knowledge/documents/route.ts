import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { ingestKnowledgeDocument } from "@/lib/knowledge/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  sourceLabel: z.string().trim().min(1).max(200),
  sourceUri: z.url().optional(),
  text: z.string().trim().min(1).max(100_000),
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
    const result = await ingestKnowledgeDocument({
      title: body.data.title,
      sourceLabel: body.data.sourceLabel,
      sourceUri: body.data.sourceUri ?? null,
      text: body.data.text,
    });
    if (result.status === 201) {
      return NextResponse.json({ documentId: result.documentId, status: "ready" }, { status: 201 });
    }
    if (result.status === 409) {
      return NextResponse.json({ error: "This source is already stored." }, { status: 409 });
    }
    if (result.status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json({ error: "The source could not be stored." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
