import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import ApprovalMap from "./approval-map";
import { GenerateApprovalsButton } from "./generate-approvals";
import { listOwnedApplications } from "@/lib/applications/queries";
import { listOwnedApplicationApprovals } from "@/lib/approvals/queries";
import { listOwnedWorkflows } from "@/lib/workflow/records";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
          Personalised Approval Intelligence
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default async function ApprovalsPage() {
  if (!readPublicSupabaseConfig()) {
    return (
      <Shell
        title="Approvals are unavailable"
        description="The approval database is not configured."
      />
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const applications = await listOwnedApplications();
  if (!applications.ok) {
    return (
      <Shell
        title="Approvals could not be loaded"
        description="The approval database did not return your applications."
      />
    );
  }

  const application = applications.data[0];
  if (!application) {
    return (
      <Shell
        title="Your Approval Map"
        description="No application has been created yet."
      >
        <Link href="/applications" className="text-xs font-semibold text-cyan-800 hover:underline">
          Create an application
        </Link>
      </Shell>
    );
  }

  const approvals = await listOwnedApplicationApprovals(application.id);
  if (!approvals.ok || !approvals.data) {
    return (
      <Shell
        title="Approvals could not be loaded"
        description="The approval database did not return this application's checklist."
      />
    );
  }

  if (approvals.data.length === 0) {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("land_classification")
      .eq("id", application.project_id)
      .maybeSingle();
    const landMissing = !project?.land_classification;

    return (
      <Shell
        title="Your Approval Map"
        description={
          landMissing
            ? `${application.project_name} does not have a land classification, so no approval checklist was created.`
            : `${application.project_name} does not have a generated approval checklist yet.`
        }
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
          <p className="text-xs text-slate-600">
            {landMissing
              ? "Insufficient project information."
              : "Generate the checklist from the project inputs. This does not submit anything to a department."}
          </p>
          <GenerateApprovalsButton applicationId={application.id} />
        </div>
      </Shell>
    );
  }

  const workflows = await listOwnedWorkflows(application.id);
  const submittedApprovalIds = new Set(
    workflows.ok && workflows.data ? workflows.data.map((workflow) => workflow.applicationApprovalId) : [],
  );
  const checklist = approvals.data.map((approval) => (
    submittedApprovalIds.has(approval.id)
      ? {
          ...approval,
          nextAction: "Submitted to the department on this approval. Receipt is not recorded. This approval is still pending.",
        }
      : approval
  ));

  return (
    <ApprovalMap
      approvals={checklist}
      projectName={application.project_name}
      applicationId={application.id}
    />
  );
}
