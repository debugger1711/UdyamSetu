import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { listOwnedQueries } from "@/lib/workflow/records";
import { MessagesDesk } from "./messages-desk";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const header = (
    <PageHeader
      title="Department Messages & Queries"
      description="Direct bilateral communications with assigned scrutiny officers and technical review desks."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Messages" },
      ]}
    />
  );

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-xs text-slate-500">Messages are unavailable. The database is not configured.</p>
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const queries = await listOwnedQueries();
  if (!queries.ok) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-xs text-slate-500">Department queries could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <MessagesDesk
        queries={queries.data.map((query) => ({
          id: query.id,
          applicationId: query.applicationId,
          departmentName: query.departmentName,
          approvalName: query.approvalName,
          body: query.body,
          status: query.status,
          createdAt: query.createdAt,
          responseBody: query.responseBody,
          responseCreatedAt: query.responseCreatedAt,
        }))}
      />
    </div>
  );
}
