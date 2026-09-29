import { redirect } from "next/navigation";
import { applicationStatusLabel } from "@/lib/applications/record";
import { AuthorizationError, getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { listVisibleInspections } from "@/lib/inspections/records";
import { slaState } from "@/lib/sla/state";
import { listDepartmentApplications } from "@/lib/workflow/records";
import { OfficerQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function OfficerDashboardPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">The officer queue is unavailable. The database is not configured.</p>;
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let queue;
  try {
    queue = await listDepartmentApplications();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/dashboard");
    throw error;
  }
  if (!queue.ok) {
    return <p className="text-xs text-slate-500">The officer queue could not be loaded.</p>;
  }

  const inspections = await listVisibleInspections();
  const now = new Date();
  const overdueCount = queue.data.reduce((count, item) => (
    count + item.workflows.filter((workflow) => slaState({
      now,
      startedAt: workflow.slaStartedAt,
      deadline: workflow.slaDeadline,
      completedAt: workflow.slaCompletedAt,
    }) === "overdue").length
  ), 0);
  const inspectionCount = inspections.ok
    ? inspections.data.filter((inspection) => inspection.status === "scheduled" || inspection.status === "assigned").length
    : 0;

  return (
    <OfficerQueue
      departments={queue.departments}
      inspectionCount={inspectionCount}
      overdueCount={overdueCount}
      items={queue.data.map((item) => ({
        id: item.applicationId,
        project: item.entityName || item.projectName,
        applicant: item.applicantName ?? "Not recorded",
        location: item.location ?? "Not recorded",
        approvalType: item.workflows.map((workflow) => workflow.approvalName).join(", "),
        statusLabel: applicationStatusLabel(item.status),
        submittedOn: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("en-IN") : "Not recorded",
      }))}
    />
  );
}
