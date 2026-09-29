import { z } from "zod";

const PLACEHOLDER_HOST = "your-project.supabase.co";
const PLACEHOLDER_ANON_KEY = "your-supabase-anon-key";

const publicSupabaseEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

export type PublicSupabaseConfig = z.infer<typeof publicSupabaseEnvSchema>;

/**
 * Reads the public Supabase URL and anon key.
 * Returns null when they are missing or still set to the example placeholders.
 * This module must not read the service role key.
 */
export function readPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const parsed = publicSupabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    return null;
  }

  let hostname = "";
  try {
    hostname = new URL(parsed.data.url).hostname;
  } catch {
    return null;
  }

  if (hostname === PLACEHOLDER_HOST || parsed.data.anonKey === PLACEHOLDER_ANON_KEY) {
    return null;
  }

  return parsed.data;
}
