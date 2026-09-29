import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CreateApplicationForm } from "@/app/(applicant)/applications/create-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listOwnedApplications } from "@/lib/applications/queries";
import { applicationStatusLabel } from "@/lib/applications/record";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { listOwnedProjects } from "@/lib/projects/queries";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const header = (
    <PageHeader
      title="Applications"
      description="Applications filed against your industrial projects."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Applications" },
      ]}
    />
  );

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Applications are unavailable</CardTitle>
            <CardDescription className="text-xs">
              The application database is not configured.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const [applications, projects] = await Promise.all([
    listOwnedApplications(),
    listOwnedProjects(),
  ]);

  if (!applications.ok || !projects.ok) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Applications could not be loaded</CardTitle>
            <CardDescription className="text-xs">
              The application database did not return your applications.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <CreateApplicationForm projects={projects.data.map((project) => ({ id: project.id, name: project.name }))} />
      <div className="grid gap-4">
        {applications.data.length === 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">No applications yet</CardTitle>
              <CardDescription className="text-xs">
                Create an application for one of your projects to see it here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : applications.data.map((application) => (
          <Card key={application.id} className="border-border hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{application.title || "Untitled application"}</CardTitle>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 text-xs">
                    {application.project_name}
                  </CardDescription>
                </div>
                <Link href={`/applications/${application.id}`}>
                  <Button variant="outline" size="sm" className="gap-1 cursor-pointer">
                    Open Application <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">
              <div className="pt-3 border-t border-border">
                Application ID: {application.id}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
