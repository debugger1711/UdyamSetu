import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { getCurrentProfile } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const profile = await getCurrentProfile();
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
