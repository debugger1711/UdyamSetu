import { redirect } from "next/navigation";
import { AuthorizationError, getAuthenticatedUser } from "@/lib/auth/session";
import { listVisibleInspections } from "@/lib/inspections/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { listDepartmentApplications } from "@/lib/workflow/records";
import { OfficerInspectionDesk } from "./desk";

export const dynamic = "force-dynamic";

export default async function OfficerInspectionsPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Inspections are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let inspections;
  let workflows;
  try {
    [inspections, workflows] = await Promise.all([
      listVisibleInspections(),
      listDepartmentApplications(),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/dashboard");
    throw error;
  }
  if (!inspections.ok || !workflows.ok) {
    return <p className="text-xs text-slate-500">Inspections could not be loaded.</p>;
  }

  const activeWorkflowIds = new Set(
    inspections.data
      .filter((inspection) => inspection.status === "scheduled" || inspection.status === "assigned")
      .map((inspection) => inspection.workflowId),
  );

  return (
    <OfficerInspectionDesk
      inspections={inspections.data.map((inspection) => ({
        id: inspection.id,
        applicationId: inspection.applicationId,
        scheduledAt: inspection.scheduledAt,
        status: inspection.status,
        location: inspection.location,
        departmentName: inspection.departmentName,
        approvalName: inspection.approvalName,
        officerName: inspection.officerName,
        reportBody: inspection.reportBody,
      }))}
      workflows={workflows.data.flatMap((application) => application.workflows)
        .filter((workflow) => !activeWorkflowIds.has(workflow.id))
        .map((workflow) => ({
          id: workflow.id,
          label: `${workflow.departmentName} · ${workflow.approvalName}`,
        }))}
    />
  );
}
