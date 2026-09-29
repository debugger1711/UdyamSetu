import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { listVisibleInspections } from "@/lib/inspections/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { InspectionDesk } from "./desk";

export const dynamic = "force-dynamic";

export default async function InspectionCoordinationPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Inspections are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const inspections = await listVisibleInspections();
  if (!inspections.ok) {
    return <p className="text-xs text-slate-500">Inspections could not be loaded.</p>;
  }
  return (
    <InspectionDesk
      inspections={inspections.data.map((inspection) => ({
        id: inspection.id,
        scheduledAt: inspection.scheduledAt,
        status: inspection.status,
        location: inspection.location,
        departmentName: inspection.departmentName,
        approvalName: inspection.approvalName,
        officerName: inspection.officerName,
      }))}
    />
  );
}
