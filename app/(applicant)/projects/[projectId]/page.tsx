import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getOwnedProject } from "@/lib/projects/queries";
import { landClassificationLabel, pollutionLabel } from "@/lib/projects/record";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

interface ProjectDetailsPageProps {
  params: Promise<{ projectId: string }>;
}

function recorded(value: string | null): string {
  return value && value.trim() ? value : "Not recorded";
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { projectId } = await params;

  if (!readPublicSupabaseConfig()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project unavailable"
          description="The project database is not configured."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/projects" },
            { label: projectId },
          ]}
        />
      </div>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (!z.uuid().safeParse(projectId).success) {
    notFound();
  }

  const result = await getOwnedProject(projectId);
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project could not be loaded"
          description="The project database did not return this project."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/projects" },
            { label: projectId },
          ]}
        />
      </div>
    );
  }

  if (!result.data || result.data.id !== projectId) {
    notFound();
  }

  const project = result.data;
  const investment = Number(project.total_investment_cr);

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description="Comprehensive project profile, approval dependency graph status, and statutory application track."
        badge={
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            Project ID: {project.id}
          </Badge>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      >
        <Link href="/approvals">
          <Button size="sm" className="gap-1.5">
            <GitBranch className="h-4 w-4" /> View Dependency Map
          </Button>
        </Link>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Project Baseline Specifications</CardTitle>
              <CardDescription className="text-xs">
                Attributes used to evaluate environmental and municipal clearances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">Entity Legal Name</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {recorded(project.entity_name)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sector & Subcategory</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {project.sector}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Project Location</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {recorded(project.location)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pollution Category</dt>
                  <dd className="font-semibold text-amber-600 mt-0.5">
                    {pollutionLabel(project.pollution_category)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Land classification</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {landClassificationLabel(project.land_classification)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total Plant & Machinery Investment</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {Number.isFinite(investment) ? `₹${investment.toFixed(2)} Crores` : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Connected Power Load</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    Not recorded
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Application counts are not loaded. This phase does not create application rows. */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Clearance Progress</CardTitle>
              <CardDescription className="text-xs">No applications stored</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-muted-foreground">Pre-Establishment</span>
                <span className="font-semibold text-emerald-600">Not recorded</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-muted-foreground">Pre-Operation</span>
                <span className="font-semibold text-amber-600">Not recorded</span>
              </div>
              <div className="pt-2">
                <Link href="/approvals" className="w-full block">
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    Manage Approvals <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
