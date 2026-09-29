import "server-only";

import { requireUser } from "@/lib/auth/session";
import { PROJECT_COLUMNS, visibleProject, visibleProjects, type ProjectRow } from "@/lib/projects/record";
import { createClient } from "@/lib/supabase/server";

export type ProjectQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" };

async function ownedClient() {
  const user = await requireUser();
  const supabase = await createClient();
  return { user, supabase };
}

export async function listOwnedProjects(): Promise<ProjectQueryResult<ProjectRow[]>> {
  const { user, supabase } = await ownedClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, data: visibleProjects((data ?? []) as ProjectRow[], user.id) };
}

export async function getOwnedProject(projectId: string): Promise<ProjectQueryResult<ProjectRow | null>> {
  const { user, supabase } = await ownedClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, data: visibleProject((data as ProjectRow | null) ?? null, user.id) };
}
