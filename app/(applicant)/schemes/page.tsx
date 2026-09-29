import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { listOwnedProjects } from "@/lib/projects/queries";
import { listActiveSchemes, listOwnSchemeClaims } from "@/lib/schemes/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { SchemeDesk } from "./desk";

export const dynamic = "force-dynamic";

export default async function SchemesPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Schemes are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const [schemes, projects, claims] = await Promise.all([
    listActiveSchemes(),
    listOwnedProjects(),
    listOwnSchemeClaims(),
  ]);
  if (!schemes.ok || !projects.ok || !claims.ok) {
    return <p className="text-xs text-slate-500">Schemes could not be loaded.</p>;
  }
  return (
    <SchemeDesk
      schemes={schemes.data}
      claims={claims.data}
      projects={projects.data.map((project) => ({
        id: project.id,
        name: project.name,
        entityName: project.entity_name,
        location: project.location,
        pollutionCategory: project.pollution_category,
        landClassification: project.land_classification,
        sector: project.sector,
        stage: project.stage,
      }))}
    />
  );
}
