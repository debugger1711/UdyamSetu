import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitApplicationButton } from "@/app/(applicant)/applications/submit-application";
import { getOwnedApplication } from "@/lib/applications/queries";
import { applicationStatusLabel } from "@/lib/applications/record";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { formatTimestamp, slaState } from "@/lib/sla/state";
import { listOwnedQueries, listOwnedWorkflows } from "@/lib/workflow/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

interface ApplicationDetailPageProps {
  params: Promise<{ applicationId: string }>;
}

function recorded(value: string | null): string {
  return value && value.trim() ? value : "Not recorded";
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { applicationId } = await params;

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Application unavailable"
          description="The application database is not configured."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Applications", href: "/applications" },
            { label: applicationId },
          ]}
        />
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (!z.uuid().safeParse(applicationId).success) {
    notFound();
  }

  const result = await getOwnedApplication(applicationId);
  if (!result.ok) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Application could not be loaded"
          description="The application database did not return this application."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Applications", href: "/applications" },
            { label: applicationId },
          ]}
        />
      </div>
    );
  }

  if (!result.data || result.data.id !== applicationId) {
    notFound();
  }

  const application = result.data;
  const submitted = application.submitted_at
    ? new Date(application.submitted_at).toLocaleDateString("en-IN")
    : "Not recorded";
  const workflows = await listOwnedWorkflows(application.id);
  const queries = await listOwnedQueries();
  const applicationQueries = queries.ok
    ? queries.data.filter((query) => query.applicationId === application.id)
    : [];
  const now = new Date();
  const slaLabels = workflows.ok && workflows.data
    ? workflows.data.map((workflow) => slaState({
        now,
        startedAt: workflow.slaStartedAt,
        deadline: workflow.slaDeadline,
        completedAt: workflow.slaCompletedAt,
      }))
    : [];
  const slaText = slaLabels.includes("overdue")
    ? "Overdue"
    : slaLabels.includes("due_soon")
      ? "Due soon"
      : slaLabels.includes("on_track")
        ? "On track"
        : "Not recorded";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
            Application · {application.id}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            {application.title || "Untitled application"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <Link href={`/projects/${application.project_id}`} className="hover:underline">
              {application.project_name}
            </Link>
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs font-bold bg-amber-50 border-amber-200 text-amber-800">
          {applicationStatusLabel(application.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Status</span>
          <span className="font-bold text-slate-800 mt-0.5 block">{applicationStatusLabel(application.status)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">SLA Countdown</span>
          <span className="font-bold text-slate-800 mt-0.5 block">{slaText}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Officer</span>
          <span className="font-medium text-slate-600 mt-0.5 block">Not recorded</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Submission Date</span>
          <span className="font-medium text-slate-600 mt-0.5 block">{submitted}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Authority Fee</span>
          <span className="font-bold text-slate-800 mt-0.5 block">Not recorded</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">Application record</h2>
        <p className="text-slate-600">Project: {recorded(application.project_name)}</p>
        <p className="text-slate-600">Approval reference: {recorded(application.approval_id)}</p>
        {application.status === "draft" ? <SubmitApplicationButton applicationId={application.id} /> : null}
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Department workflows</p>
          {!workflows.ok ? (
            <p className="text-slate-500">Department workflows could not be loaded.</p>
          ) : workflows.data && workflows.data.length > 0 ? (
            workflows.data.map((workflow) => (
              <p key={workflow.id} className="text-slate-600">
                {workflow.departmentName} · {workflow.approvalName} · {workflow.status}. Receipt is not recorded. Approval status remains {workflow.approvalStatus}. SLA {workflow.slaDeadline ? formatTimestamp(workflow.slaDeadline) : "not recorded"}.
              </p>
            ))
          ) : (
            <p className="text-slate-500">No department workflow has been created.</p>
          )}
        </div>
        <p className="text-slate-500">
          {!queries.ok
            ? "Department queries could not be loaded."
            : applicationQueries.length === 0
              ? "No department queries are recorded."
              : `${applicationQueries.length} department ${applicationQueries.length === 1 ? "query is" : "queries are"} recorded.`}
          {" "}
          <Link href="/messages" className="font-semibold text-cyan-800 hover:underline">Open messages</Link>
        </p>
      </div>
    </div>
  );
}
