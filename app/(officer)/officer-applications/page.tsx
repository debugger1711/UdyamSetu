import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationStatusLabel } from "@/lib/applications/record";
import { AuthorizationError, getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { listDepartmentApplications } from "@/lib/workflow/records";

export const dynamic = "force-dynamic";

export default async function OfficerApplicationsPage() {
  const header = (
    <PageHeader
      title="Application Scrutiny & Dossier Review"
      description="Statutory review desk for assessing regulatory completeness, issuing queries, and granting clearances."
      breadcrumbs={[
        { label: "Command Center", href: "/officer-dashboard" },
        { label: "Scrutiny Queue" },
      ]}
    />
  );

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-xs text-slate-500">Applications are unavailable. The database is not configured.</p>
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  let queue;
  try {
    queue = await listDepartmentApplications();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect(error.status === 401 ? "/login" : "/dashboard");
    throw error;
  }
  if (!queue.ok) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-xs text-slate-500">Department applications could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {queue.departments.length === 0 ? (
        <p className="text-xs text-slate-500">No department is assigned to this account.</p>
      ) : null}
      <div className="grid gap-3">
        {queue.data.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs">
            No applications have been submitted to your department.
          </div>
        ) : queue.data.map((item) => (
          <div key={item.applicationId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.entityName || item.projectName}
                  </h3>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {item.applicationId}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {applicationStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600">
                  Application: <strong className="text-slate-800">{item.workflows.map((workflow) => workflow.approvalName).join(", ")}</strong>
                  {" "}• Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("en-IN") : "Not recorded"}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Current Status: {applicationStatusLabel(item.status)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-bold block text-slate-700">Not recorded</span>
                  <span className="text-[10px] text-slate-400">Statutory SLA</span>
                </div>
                <Link href={`/officer-applications/${item.applicationId}`}>
                  <Button size="sm" className="text-xs h-8 px-3 bg-[#09192e] hover:bg-[#0f243e] text-white gap-1">
                    Review File <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
