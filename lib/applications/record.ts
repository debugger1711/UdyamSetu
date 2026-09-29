export const APPLICATION_COLUMNS =
  "id, project_id, title, approval_id, status, submitted_at, created_at, updated_at";

export type ApplicationWriteInput = {
  title: string;
};

export type ApplicationRow = {
  id: string;
  project_id: string;
  title: string | null;
  approval_id: string | null;
  status: string;
  submitted_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OwnedProjectRef = {
  id: string;
  user_id: string;
};

/** Ownership comes from the project in the route, never from the request body. */
export function toApplicationInsert(projectId: string, input: ApplicationWriteInput) {
  return {
    project_id: projectId,
    title: input.title,
    status: "draft" as const,
    approval_id: null,
  };
}

export function canCreateApplication(
  project: OwnedProjectRef | null,
  actorId: string,
): boolean {
  return project !== null && project.user_id === actorId;
}

export function visibleApplication<T extends { project_id: string }>(
  application: T | null,
  ownedProjectIds: readonly string[],
): T | null {
  if (!application || !ownedProjectIds.includes(application.project_id)) {
    return null;
  }
  return application;
}

export function visibleApplications<T extends { project_id: string }>(
  applications: T[],
  ownedProjectIds: readonly string[],
): T[] {
  return applications.filter((application) => ownedProjectIds.includes(application.project_id));
}

export function applicationStatusLabel(status: string): string {
  if (status === "draft") return "Draft";
  if (status === "submitted") return "Submitted";
  if (status === "under_review") return "Under Review";
  if (status === "query_raised") return "Query Raised";
  if (status === "query_response_submitted") return "Query Response Submitted";
  if (status === "granted") return "Granted";
  if (status === "rejected") return "Rejected";
  return "Not recorded";
}

export function toPublicApplication(row: ApplicationRow) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    approval_id: row.approval_id,
    status: row.status,
    submitted_at: row.submitted_at,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}
