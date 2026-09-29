import { createClient } from "@supabase/supabase-js";

import { readPublicSupabaseConfig } from "./env";

/**
 * Lightweight Postgres probe through PostgREST.
 * Calls public.health_check(), which returns 1 and does not read application data.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  const config = readPublicSupabaseConfig();
  if (!config) {
    return false;
  }

  try {
    const supabase = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(5000),
          }),
      },
    });

    const { data, error } = await supabase.rpc("health_check");
    return !error && data === 1;
  } catch {
    return false;
  }
}

export function healthHttpStatus(databaseReachable: boolean): 200 | 503 {
  return databaseReachable ? 200 : 503;
}
