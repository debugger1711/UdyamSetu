import { NextResponse } from "next/server";

import { signInWithPassword } from "@/lib/auth/credentials";
import { authErrorResponse } from "@/lib/auth/http";
import { loginSchema } from "@/lib/auth/schemas";
import { getCurrentProfile } from "@/lib/auth/session";
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
    const input = parseWithSchema(loginSchema, body);
    const supabase = await createClient();
    const result = await signInWithPassword(supabase, input.email, input.password);

    if (!result.ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const profile = await getCurrentProfile();
    return NextResponse.json({
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
