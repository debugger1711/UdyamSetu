import "server-only";

import { catalogEntry } from "@/lib/approvals/catalog";
import { toChecklist, type StoredApproval, type StructuredApproval } from "@/lib/approvals/checklist";
import { getOwnedApplication, listOwnedApplications } from "@/lib/applications/queries";
import { requireUser } from "@/lib/auth/session";
import { planApplicationApprovals } from "@/lib/approvals/plan";
import { createClient } from "@/lib/supabase/server";

export type ApprovalQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" };

type ApprovalJoinRow = {
  id: string;
  application_id: string;
  status: string;
  sort_order: number;
  approval_types: {
    code: string;
    name: string;
    department: string | null;
    description: string | null;
    category: string;
  } | null;
};

const APPROVAL_COLUMNS =
  "id, application_id, status, sort_order, approval_types ( code, name, department, description, category )";

function toStored(row: ApprovalJoinRow): StoredApproval | null {
  const type = Array.isArray(row.approval_types) ? row.approval_types[0] : row.approval_types;
  const entry = type ? catalogEntry(type.code) : null;
  if (!type || !entry) {
    return null;
  }
  return {
    id: row.id,
    applicationId: row.application_id,
    status: row.status,
    sortOrder: row.sort_order,
    code: type.code,
    name: type.name,
    department: type.department,
    description: type.description,
    category: entry.category,
  };
}

export async function listOwnedApplicationApprovals(
  applicationId: string,
): Promise<ApprovalQueryResult<StructuredApproval[] | null>> {
  const application = await getOwnedApplication(applicationId);
  if (!application.ok) {
    return { ok: false, reason: "unavailable" };
  }
  if (!application.data) {
    return { ok: true, data: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_approvals")
    .select(APPROVAL_COLUMNS)
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  const stored = ((data ?? []) as unknown as ApprovalJoinRow[])
    .map(toStored)
    .filter((row): row is StoredApproval => row !== null);

  return { ok: true, data: toChecklist(stored) };
}

export async function getOwnedApproval(approvalId: string): Promise<ApprovalQueryResult<StoredApproval | null>> {
  await requireUser();
  const applications = await listOwnedApplications();
  if (!applications.ok) {
    return { ok: false, reason: "unavailable" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_approvals")
    .select(APPROVAL_COLUMNS)
    .eq("id", approvalId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }

  const row = (data as unknown as ApprovalJoinRow | null) ?? null;
  if (!row || !applications.data.some((application) => application.id === row.application_id)) {
    return { ok: true, data: null };
  }

  const stored = toStored(row);
  return { ok: true, data: stored };
}

export type GenerateApprovalsResult =
  | { status: 200; codes: string[]; inserted: number }
  | { status: 404 }
  | { status: 422; missing: Array<"landClassification" | "pollutionCategory"> }
  | { status: 503 };

export async function generateOwnedApprovals(applicationId: string): Promise<GenerateApprovalsResult> {
  const application = await getOwnedApplication(applicationId);
  if (!application.ok) {
    return { status: 503 };
  }
  if (!application.data) {
    return { status: 404 };
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("user_id, land_classification, pollution_category")
    .eq("id", application.data.project_id)
    .maybeSingle();

  if (projectError || !project) {
    return { status: 503 };
  }

  const user = await requireUser();
  if (project.user_id !== user.id) {
    return { status: 404 };
  }

  const planned = planApplicationApprovals({
    landClassification: project.land_classification,
    pollutionCategory: project.pollution_category,
  });
  if (!planned.ok) {
    if (planned.code === "INSUFFICIENT_PROJECT_INFORMATION") {
      return { status: 422, missing: planned.missing };
    }
    return { status: 503 };
  }

  const { data, error } = await supabase.rpc("generate_application_approvals", {
    target_application: applicationId,
  });

  if (error || !data || typeof data !== "object") {
    return { status: 503 };
  }

  const payload = data as { ok?: boolean; code?: string; inserted?: number };
  if (payload.ok !== true) {
    if (payload.code === "INSUFFICIENT_PROJECT_INFORMATION") {
      return { status: 422, missing: ["landClassification"] };
    }
    return { status: 404 };
  }

  return { status: 200, codes: planned.planned.map((item) => item.code), inserted: Number(payload.inserted ?? 0) };
}
