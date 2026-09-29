import "server-only";

import { requireAnyRole, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type InspectionView = {
  id: string;
  applicationId: string;
  workflowId: string;
  scheduledAt: string;
  status: string;
  location: string | null;
  completedAt: string | null;
  departmentName: string;
  approvalName: string;
  officerName: string | null;
  reportBody: string | null;
};

type InspectionJoin = {
  id: string;
  application_id: string;
  department_workflow_id: string;
  scheduled_at: string;
  status: string;
  location: string | null;
  completed_at: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  application_department_workflows: {
    departments: { name: string } | { name: string }[] | null;
    application_approvals: {
      approval_types: { name: string } | { name: string }[] | null;
    } | {
      approval_types: { name: string } | { name: string }[] | null;
    }[] | null;
  } | null;
  inspection_reports: { body: string } | { body: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const INSPECTION_COLUMNS =
  "id, application_id, department_workflow_id, scheduled_at, status, location, completed_at, profiles ( full_name ), application_department_workflows ( departments ( name ), application_approvals ( approval_types ( name ) ) ), inspection_reports ( body )";

function toInspection(row: InspectionJoin): InspectionView | null {
  const workflow = one(row.application_department_workflows);
  const department = one(workflow?.departments ?? null);
  const approval = one(workflow?.application_approvals ?? null);
  const type = one(approval?.approval_types ?? null);
  const officer = one(row.profiles);
  const report = one(row.inspection_reports);
  if (!department || !type) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    workflowId: row.department_workflow_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    location: row.location,
    completedAt: row.completed_at,
    departmentName: department.name,
    approvalName: type.name,
    officerName: officer?.full_name ?? null,
    reportBody: report?.body ?? null,
  };
}

function rpcStatus(message: string): 400 | 404 | 409 | 503 {
  if (message.includes("invalid inspection")) return 400;
  if (message.includes("inspection already scheduled")) return 409;
  if (
    message.includes("inspection was not scheduled")
    || message.includes("inspection was not completed")
  ) return 404;
  return 503;
}

export async function listVisibleInspections(): Promise<
  { ok: true; data: InspectionView[] } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .select(INSPECTION_COLUMNS)
    .order("scheduled_at", { ascending: true });
  if (error) return { ok: false };
  return {
    ok: true,
    data: ((data ?? []) as unknown as InspectionJoin[]).flatMap((row) => {
      const inspection = toInspection(row);
      return inspection ? [inspection] : [];
    }),
  };
}

export async function scheduleDepartmentInspection(
  workflowId: string,
  scheduledAt: string,
): Promise<{ status: 201; inspectionId: string } | { status: 400 | 404 | 409 | 503 }> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("schedule_department_inspection", {
    target_workflow: workflowId,
    scheduled_at: scheduledAt,
  });
  if (result.error || typeof result.data !== "string") {
    return { status: rpcStatus(result.error?.message ?? "") };
  }
  return { status: 201, inspectionId: result.data };
}

export async function completeDepartmentInspection(
  inspectionId: string,
  reportBody: string,
): Promise<{ status: 200 } | { status: 400 | 404 | 503 }> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("complete_department_inspection", {
    target_inspection: inspectionId,
    report_body: reportBody,
  });
  if (result.error) {
    const status = rpcStatus(result.error.message ?? "");
    if (status === 409) return { status: 404 };
    return { status };
  }
  return { status: 200 };
}
