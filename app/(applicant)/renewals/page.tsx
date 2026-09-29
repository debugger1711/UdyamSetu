import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { listVisibleCertificates } from "@/lib/certificates/records";
import { renewalWithinDisplayWindow } from "@/lib/renewals/eligibility";
import { listVisibleRenewals } from "@/lib/renewals/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { RenewalDesk } from "./desk";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Renewals are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const [certificates, renewals] = await Promise.all([listVisibleCertificates(), listVisibleRenewals()]);
  if (!certificates.ok || !renewals.ok) {
    return <p className="text-xs text-slate-500">Renewals could not be loaded.</p>;
  }
  const now = new Date();
  return (
    <RenewalDesk
      activeCount={certificates.data.filter((item) => item.status === "issued").length}
      dueCount={certificates.data.filter((item) => renewalWithinDisplayWindow(item.validUntil, now)).length}
      certificates={certificates.data.map((item) => ({
        id: item.id,
        name: item.name,
        authority: item.authority,
        number: item.number,
        validUntil: item.validUntil,
        status: item.status,
      }))}
      renewals={renewals.data.map((item) => ({
        id: item.id,
        certificateId: item.certificateId,
        status: item.status,
        dueAt: item.dueAt,
      }))}
    />
  );
}
