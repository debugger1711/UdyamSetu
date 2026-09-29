import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CertificateView = {
  id: string;
  applicationId: string;
  number: string;
  typeCode: string;
  name: string;
  authority: string | null;
  status: string;
  validUntil: string | null;
  issuedAt: string | null;
};

type CertificateJoin = {
  id: string;
  application_id: string;
  certificate_number: string;
  certificate_type: string;
  status: string;
  valid_until: string | null;
  issued_at: string | null;
  application_approvals: {
    approval_types: { name: string } | { name: string }[] | null;
    application_department_workflows: {
      departments: { name: string } | { name: string }[] | null;
    } | {
      departments: { name: string } | { name: string }[] | null;
    }[] | null;
  } | {
    approval_types: { name: string } | { name: string }[] | null;
    application_department_workflows: {
      departments: { name: string } | { name: string }[] | null;
    } | {
      departments: { name: string } | { name: string }[] | null;
    }[] | null;
  }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const CERTIFICATE_COLUMNS =
  "id, application_id, certificate_number, certificate_type, status, valid_until, issued_at, application_approvals ( approval_types ( name ), application_department_workflows ( departments ( name ) ) )";

function toCertificate(row: CertificateJoin): CertificateView {
  const approval = one(row.application_approvals);
  const type = one(approval?.approval_types ?? null);
  const workflow = one(approval?.application_department_workflows ?? null);
  const department = one(workflow?.departments ?? null);
  return {
    id: row.id,
    applicationId: row.application_id,
    number: row.certificate_number,
    typeCode: row.certificate_type,
    name: type?.name ?? row.certificate_type,
    authority: department?.name ?? null,
    status: row.status,
    validUntil: row.valid_until,
    issuedAt: row.issued_at,
  };
}

export async function listVisibleCertificates(): Promise<
  { ok: true; data: CertificateView[] } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  return { ok: true, data: ((data ?? []) as CertificateJoin[]).map(toCertificate) };
}
