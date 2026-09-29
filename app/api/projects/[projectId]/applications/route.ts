import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  APPLICATION_COLUMNS,
  canCreateApplication,
  toApplicationInsert,
  toPublicApplication,
  visibleApplications,
  type ApplicationRow,
} from "@/lib/applications/record";
import { authErrorResponse } from "@/lib/auth/http";
import { createOwnedApplicationSchema } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/session";
import { generateOwnedApprovals } from "@/lib/approvals/queries";
import { PROJECT_COLUMNS, visibleProject, type ProjectRow } from "@/lib/projects/record";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ projectId: z.uuid() });

type RouteContext = { params: Promise<{ projectId: string }> };

function notFound() {
  return NextResponse.json({ error: "Project not found." }, { status: 404 });
}

async function readProjectId(context: RouteContext): Promise<string | null> {
  try {
    const { projectId } = parseWithSchema(paramsSchema, await context.params);
    return projectId;
  } catch (error) {
    if (error instanceof ZodError) {
      return null;
    }
    throw error;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const projectId = await readProjectId(context);
    if (!projectId) {
      return notFound();
    }

    const supabase = await createClient();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json({ error: "Applications could not be loaded." }, { status: 500 });
    }
    if (!canCreateApplication(visibleProject((project as ProjectRow | null) ?? null, user.id), user.id)) {
      return notFound();
    }

    const { data, error } = await supabase
      .from("applications")
      .select(APPLICATION_COLUMNS)
      .eq("project_id", projectId);

    if (error) {
      return NextResponse.json({ error: "Applications could not be loaded." }, { status: 500 });
    }

    const applications = visibleApplications((data ?? []) as ApplicationRow[], [projectId]).map(toPublicApplication);
    return NextResponse.json({ applications });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const projectId = await readProjectId(context);
    if (!projectId) {
      return notFound();
    }

    const input = parseWithSchema(createOwnedApplicationSchema, await request.json());
    const supabase = await createClient();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json({ error: "Application could not be created." }, { status: 400 });
    }
    if (!canCreateApplication(visibleProject((project as ProjectRow | null) ?? null, user.id), user.id)) {
      return notFound();
    }

    const { data, error } = await supabase
      .from("applications")
      .insert(toApplicationInsert(projectId, input))
      .select(APPLICATION_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Application could not be created." }, { status: 404 });
    }

    const application = data as ApplicationRow;
    const generation = await generateOwnedApprovals(application.id);
    return NextResponse.json({
      application: toPublicApplication(application),
      approvalGeneration: generation.status === 200
        ? { ok: true, codes: generation.codes, inserted: generation.inserted }
        : {
            ok: false,
            code: generation.status === 422 ? "INSUFFICIENT_PROJECT_INFORMATION" : "NOT_GENERATED",
            missing: generation.status === 422 ? generation.missing : [],
          },
    }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
