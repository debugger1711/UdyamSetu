import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight, MapPin, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { listOwnedProjects } from "@/lib/projects/queries";
import { investmentLabel, pollutionLabel, stageLabel } from "@/lib/projects/record";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const header = (
    <PageHeader
      title="Industrial Projects"
      description="Manage your enterprise facilities, planned industrial setups, and regional units."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Projects" },
      ]}
    >
      <Link href="/projects/new">
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Register New Project
        </Button>
      </Link>
    </PageHeader>
  );

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Projects are unavailable</CardTitle>
            <CardDescription className="text-xs">
              The project database is not configured.
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

  const result = await listOwnedProjects();
  if (!result.ok) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Projects could not be loaded</CardTitle>
            <CardDescription className="text-xs">
              The project database did not return your projects.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <div className="grid gap-4">
        {result.data.length === 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">No projects yet</CardTitle>
              <CardDescription className="text-xs">
                Register a project to see it in this list.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : result.data.map((project) => (
          <Card key={project.id} className="border-border hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      {pollutionLabel(project.pollution_category)}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 flex items-center gap-4 text-xs">
                    {project.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {project.location}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" /> {investmentLabel(project.total_investment_cr)}
                    </span>
                  </CardDescription>
                </div>

                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" size="sm" className="gap-1 cursor-pointer">
                    Open Project <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">
              <div className="flex flex-wrap gap-6 pt-3 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Sector: </span>
                  <span className="font-medium text-foreground">{project.sector}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Project Stage: </span>
                  <span className="font-medium text-foreground">{stageLabel(project.stage)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Approvals Mapped: </span>
                  <span className="font-bold text-teal-700">Not started</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
