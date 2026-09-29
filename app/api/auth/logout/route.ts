import { NextResponse } from "next/server";

import { signOut } from "@/lib/auth/credentials";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await signOut(supabase);
  return NextResponse.json({ ok: true });
}
