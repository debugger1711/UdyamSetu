import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type RenewalView = {
  id: string;
  certificateId: string;
  applicationId: string;
  status: string;
  dueAt: string | null;
  submittedAt: string | null;
};

function renewalStatus(message: string): 400 | 404 | 409 | 503 {
  if (message.includes("renewal is not configured")) return 409;
  if (message.includes("renewal already open")) return 409;
  if (message.includes("renewal was not created") || message.includes("renewal was not submitted")) return 404;
  return 503;
}

export async function listVisibleRenewals(): Promise<
  { ok: true; data: RenewalView[] } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("renewals")
    .select("id, certificate_id, application_id, status, renewal_due_at, submitted_at")
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  const rows = (data ?? []) as Array<{
    id: string;
    certificate_id: string;
    application_id: string;
    status: string;
    renewal_due_at: string | null;
    submitted_at: string | null;
  }>;
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      certificateId: row.certificate_id,
      applicationId: row.application_id,
      status: row.status,
      dueAt: row.renewal_due_at,
      submittedAt: row.submitted_at,
    })),
  };
}

export async function createOwnRenewal(certificateId: string): Promise<
  { status: 201; renewalId: string } | { status: 404 | 409 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("create_certificate_renewal", {
    target_certificate: certificateId,
  });
  if (result.error) {
    const status = renewalStatus(result.error.message ?? "");
    return { status: status === 400 ? 404 : status };
  }
  return { status: 201, renewalId: String(result.data) };
}

export async function submitOwnRenewal(renewalId: string): Promise<
  { status: 200 } | { status: 404 | 409 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("submit_certificate_renewal", {
    target_renewal: renewalId,
  });
  if (result.error) {
    const status = renewalStatus(result.error.message ?? "");
    return { status: status === 400 ? 404 : status };
  }
  return { status: 200 };
}
