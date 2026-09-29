import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SchemeView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  authority: string | null;
  rules: unknown;
};

export type SchemeClaimView = {
  id: string;
  schemeId: string;
  projectId: string;
  status: string;
  submittedAt: string | null;
};

function claimStatus(message: string): 400 | 404 | 409 | 503 {
  if (message.includes("scheme eligibility is insufficient")) return 409;
  if (message.includes("scheme application already submitted")) return 409;
  if (message.includes("scheme application was not submitted")) return 404;
  return 503;
}

export async function listActiveSchemes(): Promise<{ ok: true; data: SchemeView[] } | { ok: false }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schemes")
    .select("id, code, name, description, authority, eligibility_rules")
    .order("name", { ascending: true });
  if (error) return { ok: false };
  const rows = (data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    authority: string | null;
    eligibility_rules: unknown;
  }>;
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      authority: row.authority,
      rules: row.eligibility_rules,
    })),
  };
}

export async function listOwnSchemeClaims(): Promise<
  { ok: true; data: SchemeClaimView[] } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheme_applications")
    .select("id, scheme_id, project_id, status, submitted_at")
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  const rows = (data ?? []) as Array<{
    id: string;
    scheme_id: string;
    project_id: string;
    status: string;
    submitted_at: string | null;
  }>;
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      schemeId: row.scheme_id,
      projectId: row.project_id,
      status: row.status,
      submittedAt: row.submitted_at,
    })),
  };
}

export async function submitOwnSchemeClaim(schemeId: string, projectId: string): Promise<
  { status: 201; claimId: string } | { status: 404 | 409 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("submit_scheme_application", {
    target_scheme: schemeId,
    target_project: projectId,
  });
  if (result.error) {
    const status = claimStatus(result.error.message ?? "");
    return { status: status === 400 ? 404 : status };
  }
  return { status: 201, claimId: String(result.data) };
}
