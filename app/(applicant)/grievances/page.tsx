import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { listDepartments, listVisibleGrievances } from "@/lib/grievances/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { GrievanceDesk } from "./desk";

export const dynamic = "force-dynamic";

export default async function GrievancesPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Grievances are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const [grievances, departments] = await Promise.all([listVisibleGrievances(), listDepartments()]);
  if (!grievances.ok || !departments.ok) {
    return <p className="text-xs text-slate-500">Grievances could not be loaded.</p>;
  }
  return <GrievanceDesk grievances={grievances.data} departments={departments.data} />;
}
