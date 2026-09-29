import "server-only";

import { getOwnedApplication } from "@/lib/applications/queries";
import { getCurrentProfile, requireAnyRole, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type WorkflowView = {
  id: string;
  applicationId: string;
  applicationApprovalId: string;
  status: string;
  submittedAt: string;
  departmentCode: string;
  departmentName: string;
  approvalCode: string;
  approvalName: string;
  approvalStatus: string;
  slaStartedAt: string | null;
  slaDeadline: string | null;
  slaCompletedAt: string | null;
};

export type QueryView = {
  id: string;
  applicationId: string;
  workflowId: string;
  body: string;
  status: string;
  createdAt: string;
  departmentCode: string;
  departmentName: string;
  approvalName: string;
  responseBody: string | null;
  responseCreatedAt: string | null;
};

export type DepartmentApplication = {
  applicationId: string;
  title: string | null;
  status: string;
  submittedAt: string | null;
  projectName: string;
  entityName: string | null;
  location: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  workflows: WorkflowView[];
};

type WorkflowJoin = {
  id: string;
  application_id: string;
  application_approval_id: string;
  status: string;
  submitted_at: string;
  sla_started_at: string | null;
  sla_deadline: string | null;
  sla_completed_at: string | null;
  departments: { code: string; name: string } | { code: string; name: string }[] | null;
  application_approvals: {
    status: string;
    approval_types: { code: string; name: string } | { code: string; name: string }[] | null;
  } | {
    status: string;
    approval_types: { code: string; name: string } | { code: string; name: string }[] | null;
  }[] | null;
  applications: {
    id: string;
    title: string | null;
    status: string;
    submitted_at: string | null;
    projects: {
      name: string;
      entity_name: string | null;
      location: string | null;
      profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
    } | {
      name: string;
      entity_name: string | null;
      location: string | null;
      profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
    }[] | null;
  } | null;
};

type QueryJoin = {
  id: string;
  application_id: string;
  department_workflow_id: string;
  body: string;
  status: string;
  created_at: string;
  application_department_workflows: {
    departments: { code: string; name: string } | { code: string; name: string }[] | null;
    application_approvals: {
      approval_types: { name: string } | { name: string }[] | null;
    } | {
      approval_types: { name: string } | { name: string }[] | null;
    }[] | null;
  } | null;
  application_query_responses: { body: string; created_at: string } | { body: string; created_at: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toWorkflow(row: WorkflowJoin): WorkflowView | null {
  const department = one(row.departments);
  const approval = one(row.application_approvals);
  const type = one(approval?.approval_types ?? null);
  if (!department || !approval || !type) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    applicationApprovalId: row.application_approval_id,
    status: row.status,
    submittedAt: row.submitted_at,
    departmentCode: department.code,
    departmentName: department.name,
    approvalCode: type.code,
    approvalName: type.name,
    approvalStatus: approval.status,
    slaStartedAt: row.sla_started_at,
    slaDeadline: row.sla_deadline,
    slaCompletedAt: row.sla_completed_at,
  };
}

const WORKFLOW_COLUMNS =
  "id, application_id, application_approval_id, status, submitted_at, sla_started_at, sla_deadline, sla_completed_at, departments ( code, name ), application_approvals ( status, approval_types ( code, name ) ), applications ( id, title, status, submitted_at, projects ( name, entity_name, location, profiles ( full_name, email ) ) )";

const QUERY_COLUMNS =
  "id, application_id, department_workflow_id, body, status, created_at, application_department_workflows ( departments ( code, name ), application_approvals ( approval_types ( name ) ) ), application_query_responses ( body, created_at )";

function rpcFailure(message: string): number {
  if (message.includes("application is not a draft") || message.includes("query was not open")) return 409;
  if (message.includes("approval checklist missing") || message.includes("department not recorded")) return 422;
  if (message.includes("invalid query") || message.includes("invalid response")) return 400;
  if (
    message.includes("application was not submitted")
    || message.includes("query was not created")
    || message.includes("response was not recorded")
  ) {
    return 404;
  }
  return 503;
}

export async function submitOwnedApplication(applicationId: string): Promise<
  | { status: 200; applicationStatus: "submitted"; workflows: number }
  | { status: 404 | 409 | 422 | 503 }
> {
  const application = await getOwnedApplication(applicationId);
  if (!application.ok) return { status: 503 };
  if (!application.data) return { status: 404 };

  const supabase = await createClient();
  const result = await supabase.rpc("submit_application", { target_application: applicationId });
  if (result.error) return { status: rpcFailure(result.error.message ?? "") as 404 | 409 | 422 | 503 };

  const payload = result.data as { status?: string; workflows?: number } | null;
  if (!payload || payload.status !== "submitted") return { status: 503 };
  return { status: 200, applicationStatus: "submitted", workflows: Number(payload.workflows ?? 0) };
}

export async function listOwnedWorkflows(applicationId: string): Promise<
  | { ok: true; data: WorkflowView[] | null }
  | { ok: false }
> {
  const application = await getOwnedApplication(applicationId);
  if (!application.ok) return { ok: false };
  if (!application.data) return { ok: true, data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_department_workflows")
    .select(WORKFLOW_COLUMNS)
    .eq("application_id", applicationId)
    .order("submitted_at", { ascending: true });

  if (error) return { ok: false };
  return {
    ok: true,
    data: ((data ?? []) as unknown as WorkflowJoin[]).flatMap((row) => {
      const workflow = toWorkflow(row);
      return workflow ? [workflow] : [];
    }),
  };
}

export async function listOwnedQueries(): Promise<{ ok: true; data: QueryView[] } | { ok: false }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_queries")
    .select(QUERY_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return { ok: false };
  return { ok: true, data: ((data ?? []) as unknown as QueryJoin[]).flatMap(toQuery) };
}

function toQuery(row: QueryJoin): QueryView[] {
  const workflow = one(row.application_department_workflows);
  const department = one(workflow?.departments ?? null);
  const approval = one(workflow?.application_approvals ?? null);
  const type = one(approval?.approval_types ?? null);
  const response = one(row.application_query_responses);
  if (!department || !type) return [];
  return [{
    id: row.id,
    applicationId: row.application_id,
    workflowId: row.department_workflow_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    departmentCode: department.code,
    departmentName: department.name,
    approvalName: type.name,
    responseBody: response?.body ?? null,
    responseCreatedAt: response?.created_at ?? null,
  }];
}

export async function respondToOwnedQuery(queryId: string, answer: string): Promise<
  { status: 200 } | { status: 400 | 404 | 409 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("respond_to_query", {
    target_query: queryId,
    answer,
  });
  if (result.error) return { status: rpcFailure(result.error.message ?? "") as 400 | 404 | 409 | 503 };
  return { status: 200 };
}

export async function listDepartmentApplications(): Promise<
  | { ok: true; data: DepartmentApplication[]; departments: string[] }
  | { ok: false }
> {
  const profile = await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const memberships = await supabase
    .from("officer_departments")
    .select("departments ( code, name )")
    .eq("user_id", profile.id);

  if (memberships.error) return { ok: false };
  const departments = ((memberships.data ?? []) as unknown as Array<{
    departments: { code: string; name: string } | { code: string; name: string }[] | null;
  }>).flatMap((row) => {
    const department = one(row.departments);
    return department ? [department.name] : [];
  });

  const { data, error } = await supabase
    .from("application_department_workflows")
    .select(WORKFLOW_COLUMNS)
    .order("submitted_at", { ascending: false });

  if (error) return { ok: false };

  const grouped = new Map<string, DepartmentApplication>();
  for (const row of (data ?? []) as unknown as WorkflowJoin[]) {
    const workflow = toWorkflow(row);
    const application = one(row.applications);
    const project = one(application?.projects ?? null);
    const applicant = one(project?.profiles ?? null);
    if (!workflow || !application || !project) continue;
    const existing = grouped.get(application.id);
    if (existing) {
      existing.workflows.push(workflow);
      continue;
    }
    grouped.set(application.id, {
      applicationId: application.id,
      title: application.title,
      status: application.status,
      submittedAt: application.submitted_at,
      projectName: project.name,
      entityName: project.entity_name,
      location: project.location,
      applicantName: applicant?.full_name ?? null,
      applicantEmail: applicant?.email ?? null,
      workflows: [workflow],
    });
  }

  return { ok: true, data: [...grouped.values()], departments };
}

export async function getDepartmentApplication(applicationId: string): Promise<
  | { ok: true; data: DepartmentApplication | null }
  | { ok: false }
> {
  const listed = await listDepartmentApplications();
  if (!listed.ok) return { ok: false };
  return { ok: true, data: listed.data.find((item) => item.applicationId === applicationId) ?? null };
}

export async function listDepartmentApplicationDocuments(applicationId: string): Promise<
  | { ok: true; data: Array<{ id: string; name: string; file_name: string; status: string }> | null }
  | { ok: false }
> {
  const application = await getDepartmentApplication(applicationId);
  if (!application.ok) return { ok: false };
  if (!application.data) return { ok: true, data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, file_name, status")
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: false });

  if (error) return { ok: false };
  return {
    ok: true,
    data: (data ?? []) as Array<{ id: string; name: string; file_name: string; status: string }>,
  };
}

export async function listDepartmentQueries(applicationId: string): Promise<
  { ok: true; data: QueryView[] } | { ok: false }
> {
  const application = await getDepartmentApplication(applicationId);
  if (!application.ok) return { ok: false };
  if (!application.data) return { ok: true, data: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_queries")
    .select(QUERY_COLUMNS)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false };
  return { ok: true, data: ((data ?? []) as unknown as QueryJoin[]).flatMap(toQuery) };
}

export async function getDepartmentDocument(documentId: string): Promise<
  | { ok: true; data: { storage_path: string; mime_type: string; file_name: string } | null }
  | { ok: false }
> {
  const profile = await getCurrentProfile();
  if (profile.role !== "officer" && profile.role !== "admin") {
    return { ok: true, data: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, application_id, storage_path, mime_type, file_name")
    .eq("id", documentId)
    .maybeSingle();

  if (error) return { ok: false };
  const row = data as {
    application_id: string;
    storage_path: string;
    mime_type: string;
    file_name: string;
  } | null;
  if (!row) return { ok: true, data: null };
  const application = await getDepartmentApplication(row.application_id);
  if (!application.ok) return { ok: false };
  if (!application.data) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      storage_path: row.storage_path,
      mime_type: row.mime_type,
      file_name: row.file_name,
    },
  };
}

export async function raiseDepartmentQuery(workflowId: string, question: string): Promise<
  { status: 201; queryId: string } | { status: 400 | 404 | 503 }
> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("raise_department_query", {
    target_workflow: workflowId,
    question,
  });
  if (result.error || typeof result.data !== "string") {
    return { status: rpcFailure(result.error?.message ?? "") as 400 | 404 | 503 };
  }
  return { status: 201, queryId: result.data };
}
