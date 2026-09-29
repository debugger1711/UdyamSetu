import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { readPublicSupabaseConfig } from "./env";

const PLACEHOLDER_SERVICE_ROLE_KEY = "your-supabase-service-role-key";

const serviceRoleKeySchema = z.string().min(1);

/**
 * Service-role client for later server-only jobs.
 * Importing this module from a Client Component fails the build via `server-only`.
 * Phase 0 does not call it from any page or route.
 */
export function createAdminClient() {
  const config = readPublicSupabaseConfig();
  const parsedKey = serviceRoleKeySchema.safeParse(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!config || !parsedKey.success || parsedKey.data === PLACEHOLDER_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin client is not configured.");
  }

  return createClient(config.url, parsedKey.data, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
