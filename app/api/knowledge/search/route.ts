import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { searchKnowledge } from "@/lib/knowledge/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(1000),
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
    const result = await searchKnowledge(body.data.query);
    if (!result.ok) {
      return NextResponse.json({ error: "Sources could not be searched." }, { status: 503 });
    }
    return NextResponse.json({ citations: result.citations });
  } catch (error) {
    return authErrorResponse(error);
  }
}
