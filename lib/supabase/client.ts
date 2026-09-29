import { createBrowserClient } from "@supabase/ssr";

import { readPublicSupabaseConfig } from "./env";

/**
 * Browser Supabase client. Uses the public anon key only.
 * Session cookies are handled by @supabase/ssr so later phases can read them on the server.
 */
export function createClient() {
  const config = readPublicSupabaseConfig();
  if (!config) {
    throw new Error("Supabase browser client is not configured.");
  }

  return createBrowserClient(config.url, config.anonKey);
}
