import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DocumentsVault from "./documents-vault";
import { listOwnedApplications } from "@/lib/applications/queries";
import { listOwnedDocuments } from "@/lib/documents/records";
import { toVaultDocument } from "@/lib/documents/present";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

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
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
          Enterprise Document Vault
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default async function DocumentsPage() {
  if (!readPublicSupabaseConfig()) {
    return (
      <Shell
        title="Documents are unavailable"
        description="The document database is not configured."
      />
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const applications = await listOwnedApplications();
  if (!applications.ok) {
    return (
      <Shell
        title="Documents could not be loaded"
        description="The document database did not return your applications."
      />
    );
  }

  const application = applications.data[0];
  if (!application) {
    return (
      <Shell
        title="Documents & Pre-Validation"
        description="No application has been created yet."
      >
        <Link href="/applications" className="text-xs font-semibold text-teal-800 hover:underline">
          Create an application
        </Link>
      </Shell>
    );
  }

  const documents = await listOwnedDocuments(application.id);
  if (!documents.ok || !documents.data) {
    return (
      <Shell
        title="Documents could not be loaded"
        description="The document database did not return this application's files."
      />
    );
  }

  return (
    <DocumentsVault
      applicationId={application.id}
      documents={documents.data.map(toVaultDocument)}
    />
  );
}
