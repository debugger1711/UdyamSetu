import "server-only";

import { AuthorizationError, getCurrentProfile } from "@/lib/auth/session";
import { presentApplicantDashboard, type DashboardFacts, type DashboardView } from "@/lib/dashboard/present";
import { createClient } from "@/lib/supabase/server";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const unavailableFacts = (): DashboardFacts => ({
  unavailable: true,
  fullName: null,
  project: null,
  application: null,
  approvals: [],
  documentsUploaded: 0,
  queries: [],
  inspections: [],
  workflows: [],
});

export async function loadApplicantDashboard(now = new Date()): Promise<DashboardView> {
  if (!readPublicSupabaseConfig()) {
    return presentApplicantDashboard(unavailableFacts(), now);
  }

  let profile;
  try {
    profile = await getCurrentProfile();
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) throw error;
    return presentApplicantDashboard(unavailableFacts(), now);
  }
  const supabase = await createClient();
  const projects = await supabase
    .from("projects")
    .select("id, name, entity_name, sector")
    .order("created_at", { ascending: false });
  const applications = await supabase
    .from("applications")
    .select("id, status, project_id")
    .order("created_at", { ascending: false });
  if (projects.error || applications.error) {
    return presentApplicantDashboard(unavailableFacts(), now);
  }

  const projectRows = (projects.data ?? []) as Array<{
    id: string;
    name: string;
    entity_name: string | null;
    sector: string;
  }>;
  const applicationRows = (applications.data ?? []) as Array<{
    id: string;
    status: string;
    project_id: string;
  }>;
  const applicationIds = applicationRows.map((row) => row.id);
  const empty = { data: [], error: null };
  const [approvals, documents, queries, inspections, workflows] = await Promise.all([
    applicationIds.length === 0 ? Promise.resolve(empty) : supabase
      .from("application_approvals")
      .select("status, approval_types ( category, department )")
      .in("application_id", applicationIds),
    applicationIds.length === 0 ? Promise.resolve(empty) : supabase
      .from("documents")
      .select("status")
      .in("application_id", applicationIds),
    applicationIds.length === 0 ? Promise.resolve(empty) : supabase
      .from("application_queries")
      .select("status, body, application_id")
      .in("application_id", applicationIds),
    applicationIds.length === 0 ? Promise.resolve(empty) : supabase
      .from("inspections")
      .select("status, scheduled_at")
      .in("application_id", applicationIds)
      .order("scheduled_at", { ascending: true }),
    applicationIds.length === 0 ? Promise.resolve(empty) : supabase
      .from("application_department_workflows")
      .select("sla_started_at, sla_deadline, sla_completed_at")
      .in("application_id", applicationIds),
  ]);
  if (approvals.error || documents.error || queries.error || inspections.error || workflows.error) {
    return presentApplicantDashboard(unavailableFacts(), now);
  }

  const focus = projectRows[0] ?? null;
  const facts: DashboardFacts = {
    unavailable: false,
    fullName: profile.fullName,
    project: focus ? { entityName: focus.entity_name, name: focus.name, sector: focus.sector } : null,
    application: applicationRows[0] ? { id: applicationRows[0].id, status: applicationRows[0].status } : null,
    approvals: ((approvals.data ?? []) as Array<{
      status: string;
      approval_types: { category: string | null; department: string | null } | { category: string | null; department: string | null }[] | null;
    }>).map((row) => {
      const type = one(row.approval_types);
      return { status: row.status, category: type?.category ?? null, department: type?.department ?? null };
    }),
    documentsUploaded: ((documents.data ?? []) as Array<{ status: string }>).filter((row) => row.status === "uploaded").length,
    queries: ((queries.data ?? []) as Array<{ status: string; body: string; application_id: string }>).map((row) => ({
      applicationId: row.application_id,
      status: row.status,
      body: row.body,
    })),
    inspections: ((inspections.data ?? []) as Array<{ status: string; scheduled_at: string | null }>).map((row) => ({
      status: row.status,
      scheduledAt: row.scheduled_at,
    })),
    workflows: ((workflows.data ?? []) as Array<{
      sla_started_at: string | null;
      sla_deadline: string | null;
      sla_completed_at: string | null;
    }>).map((row) => ({
      slaStartedAt: row.sla_started_at,
      slaDeadline: row.sla_deadline,
      slaCompletedAt: row.sla_completed_at,
    })),
  };
  return presentApplicantDashboard(facts, now);
}
