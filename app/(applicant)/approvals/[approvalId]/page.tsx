import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOwnedApproval } from "@/lib/approvals/queries";
import { listOwnedWorkflows } from "@/lib/workflow/records";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

interface ApprovalDetailsPageProps {
  params: Promise<{ approvalId: string }>;
}

export default async function ApprovalDetailsPage({ params }: ApprovalDetailsPageProps) {
  const { approvalId } = await params;

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Approval unavailable"
          description="The approval database is not configured."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Approvals", href: "/approvals" },
            { label: approvalId },
          ]}
        />
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (!z.uuid().safeParse(approvalId).success) {
    notFound();
  }

  const result = await getOwnedApproval(approvalId);
  if (!result.ok) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Approval could not be loaded"
          description="The approval database did not return this approval."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Approvals", href: "/approvals" },
            { label: approvalId },
          ]}
        />
      </div>
    );
  }

  if (!result.data || result.data.id !== approvalId) {
    notFound();
  }

  const approval = result.data;
  const workflows = await listOwnedWorkflows(approval.applicationId);
  const workflow = workflows.ok && workflows.data
    ? workflows.data.find((item) => item.applicationApprovalId === approval.id) ?? null
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={approval.name}
        description={
          workflow
            ? `Submitted to ${workflow.departmentName}. Receipt is not recorded. This approval is still pending.`
            : "Required approval recorded for this application. Department submission has not started."
        }
        badge={<Badge variant="outline">{approval.code}</Badge>}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Approvals", href: "/approvals" },
          { label: approval.name },
        ]}
      >
        <Link href={`/applications/${approval.applicationId}`}>
          <Button size="sm">Open application</Button>
        </Link>
      </PageHeader>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Approval Profile</CardTitle>
          <CardDescription className="text-xs">
            {workflow
              ? `Workflow status: ${workflow.status}. Pending approval. This record does not mean a department has received the application.`
              : "Pending. This record does not mean a department has received the application."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground block">Competent Authority:</span>
              <span className="font-semibold text-foreground text-sm">
                {approval.department ?? "Not recorded"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Statutory SLA Commitment:</span>
              <span className="font-semibold text-foreground text-sm">
                Not recorded
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="font-semibold text-foreground mb-2">Description</h4>
            <p className="text-muted-foreground">{approval.description || "Not recorded"}</p>
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="font-semibold text-foreground mb-2">Mandatory Pre-requisite Documents:</h4>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Not recorded</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
