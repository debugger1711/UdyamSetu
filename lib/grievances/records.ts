import "server-only";

import { requireAnyRole, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type GrievanceView = {
  id: string;
  subject: string;
  description: string;
  status: string;
  departmentName: string | null;
  createdAt: string;
  resolutionNote: string | null;
};

export type DepartmentOption = {
  id: string;
  name: string;
};

type GrievanceJoin = {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  resolution_note: string | null;
  departments: { name: string } | { name: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function grievanceStatus(message: string): 400 | 404 | 409 | 503 {
  if (message.includes("invalid grievance")) return 400;
  if (message.includes("escalation path is not configured")) return 409;
  if (message.includes("grievance was not created") || message.includes("grievance was not updated")) return 404;
  return 503;
}

export async function listVisibleGrievances(): Promise<
  { ok: true; data: GrievanceView[] } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grievances")
    .select("id, subject, description, status, created_at, resolution_note, departments ( name )")
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  return {
    ok: true,
    data: ((data ?? []) as GrievanceJoin[]).map((row) => ({
      id: row.id,
      subject: row.subject,
      description: row.description,
      status: row.status,
      departmentName: one(row.departments)?.name ?? null,
      createdAt: row.created_at,
      resolutionNote: row.resolution_note,
    })),
  };
}

export async function listDepartments(): Promise<{ ok: true; data: DepartmentOption[] } | { ok: false }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("id, name").order("name", { ascending: true });
  if (error) return { ok: false };
  return { ok: true, data: (data ?? []) as DepartmentOption[] };
}

export async function createOwnGrievance(input: {
  applicationId: string | null;
  departmentId: string | null;
  subject: string;
  description: string;
}): Promise<{ status: 201; grievanceId: string } | { status: 400 | 404 | 503 }> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("create_grievance", {
    target_application: input.applicationId,
    target_department: input.departmentId,
    grievance_subject: input.subject,
    grievance_body: input.description,
  });
  if (result.error) {
    const status = grievanceStatus(result.error.message ?? "");
    if (status === 409) return { status: 400 };
    return { status };
  }
  return { status: 201, grievanceId: String(result.data) };
}

export async function assignDepartmentGrievance(grievanceId: string): Promise<
  { status: 200 } | { status: 404 | 503 }
> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("assign_grievance", { target_grievance: grievanceId });
  if (result.error) {
    const status = grievanceStatus(result.error.message ?? "");
    return { status: status === 400 || status === 409 ? 404 : status };
  }
  return { status: 200 };
}

export async function resolveDepartmentGrievance(grievanceId: string, note: string): Promise<
  { status: 200 } | { status: 400 | 404 | 503 }
> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("resolve_grievance", {
    target_grievance: grievanceId,
    note,
  });
  if (result.error) {
    const status = grievanceStatus(result.error.message ?? "");
    return { status: status === 409 ? 404 : status };
  }
  return { status: 200 };
}

export async function escalateDepartmentGrievance(grievanceId: string, reason: string): Promise<
  { status: 200; escalationId: string } | { status: 400 | 404 | 409 | 503 }
> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("escalate_grievance", {
    target_grievance: grievanceId,
    escalation_reason: reason,
  });
  if (result.error) return { status: grievanceStatus(result.error.message ?? "") };
  return { status: 200, escalationId: String(result.data) };
}
