import "server-only";

import {
  APPLICATION_COLUMNS,
  visibleApplication,
  visibleApplications,
  type ApplicationRow,
} from "@/lib/applications/record";
import { requireUser } from "@/lib/auth/session";
import { visibleProjects, type ProjectRow } from "@/lib/projects/record";
import { createClient } from "@/lib/supabase/server";

export type ApplicationQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" };

export type ApplicationWithProject = ApplicationRow & {
  project_name: string;
};

async function ownedProjects() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name")
    .order("created_at", { ascending: false });

  if (error) {
    return { user, supabase, projects: null as null };
  }

  const projects = visibleProjects((data ?? []) as ProjectRow[], user.id);
  return { user, supabase, projects };
}

export async function listOwnedApplications(): Promise<ApplicationQueryResult<ApplicationWithProject[]>> {
  const { supabase, projects } = await ownedProjects();
  if (!projects) {
    return { ok: false, reason: "unavailable" };
  }
  if (projects.length === 0) {
    return { ok: true, data: [] };
  }

  const projectIds = projects.map((project) => project.id);
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  const names = new Map(projects.map((project) => [project.id, project.name]));
  const applications = visibleApplications((data ?? []) as ApplicationRow[], projectIds).map((row) => ({
    ...row,
    project_name: names.get(row.project_id) ?? "Project",
  }));

  return { ok: true, data: applications };
}

export async function getOwnedApplication(
  applicationId: string,
): Promise<ApplicationQueryResult<ApplicationWithProject | null>> {
  const { supabase, projects } = await ownedProjects();
  if (!projects) {
    return { ok: false, reason: "unavailable" };
  }

  const projectIds = projects.map((project) => project.id);
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  const application = visibleApplication((data as ApplicationRow | null) ?? null, projectIds);
  if (!application) {
    return { ok: true, data: null };
  }

  const project = projects.find((item) => item.id === application.project_id);
  return {
    ok: true,
    data: {
      ...application,
      project_name: project?.name ?? "Project",
    },
  };
}
