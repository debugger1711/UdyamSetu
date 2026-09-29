import { NextResponse } from "next/server";

import { registerOfficerRegistration } from "@/lib/auth/credentials";
import { authErrorResponse } from "@/lib/auth/http";
import { signupSchema } from "@/lib/auth/schemas";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const body: unknown = await request.json();
    const input = parseWithSchema(signupSchema, body);
    const supabase = await createClient();
    const result = await registerOfficerRegistration(supabase, input);

    if (!result.ok) {
      return NextResponse.json({ error: "Account could not be created." }, { status: 400 });
    }

    return NextResponse.json({
      userId: result.userId,
      role: "applicant",
      officerRegistration: "pending",
      needsEmailConfirmation: result.needsEmailConfirmation === true,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
