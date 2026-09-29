import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { applicationStatusLabel } from "@/lib/applications/record";
import { AuthorizationError, getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import {
  getDepartmentApplication,
  listDepartmentApplicationDocuments,
  listDepartmentQueries,
} from "@/lib/workflow/records";
import { OfficerReview } from "./review";

export const dynamic = "force-dynamic";

export default async function OfficerApplicationDetailsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  if (!readPublicSupabaseConfig()) {
    return (
      <PageHeader
        title="Application unavailable"
        description="The database is not configured."
      />
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!z.uuid().safeParse(applicationId).success) notFound();

  let application;
  try {
    application = await getDepartmentApplication(applicationId);
  } catch (error) {
    if (error instanceof AuthorizationError) redirect(error.status === 401 ? "/login" : "/dashboard");
    throw error;
  }
  if (!application.ok) {
    return (
      <PageHeader
        title="Application could not be loaded"
        description="The department workflow did not return this application."
      />
    );
  }
  if (!application.data) notFound();

  const [documents, queries] = await Promise.all([
    listDepartmentApplicationDocuments(applicationId),
    listDepartmentQueries(applicationId),
  ]);
  if (!documents.ok || !queries.ok || !documents.data) {
    return (
      <PageHeader
        title="Application could not be loaded"
        description="The department workflow did not return this file."
      />
    );
  }

  const item = application.data;
  return (
    <OfficerReview
      applicationId={item.applicationId}
      applicantName={item.applicantName ?? "Not recorded"}
      applicantEmail={item.applicantEmail ?? "Not recorded"}
      projectName={item.entityName || item.projectName}
      location={item.location ?? "Not recorded"}
      submittedAt={item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("en-IN") : "Not recorded"}
      applicationStatus={applicationStatusLabel(item.status)}
      workflows={item.workflows.map((workflow) => ({
        id: workflow.id,
        applicationApprovalId: workflow.applicationApprovalId,
        departmentName: workflow.departmentName,
        approvalName: workflow.approvalName,
        approvalStatus: workflow.approvalStatus,
        status: workflow.status,
      }))}
      documents={documents.data.map((document) => ({
        id: document.id,
        name: document.name,
        fileName: document.file_name,
        status: document.status,
      }))}
      queries={queries.data.map((query) => ({
        id: query.id,
        body: query.body,
        status: query.status,
        createdAt: query.createdAt,
        responseBody: query.responseBody,
        responseCreatedAt: query.responseCreatedAt,
      }))}
    />
  );
}
