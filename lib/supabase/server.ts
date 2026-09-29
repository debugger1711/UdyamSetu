import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readPublicSupabaseConfig } from "./env";

/**
 * Per-request Supabase client bound to the caller session cookies.
 * Uses the anon key. Row access is enforced later by RLS, not by this client.
 */
export async function createClient() {
  const config = readPublicSupabaseConfig();
  if (!config) {
    throw new Error("Supabase server client is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies.
          // proxy.ts performs the session refresh that persists new tokens.
        }
      },
    },
  });
}
