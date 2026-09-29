import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { createOwnedProjectSchema } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/session";
import {
  PROJECT_COLUMNS,
  toProjectUpdate,
  toPublicProject,
  visibleProject,
  type ProjectRow,
} from "@/lib/projects/record";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ projectId: z.uuid() });
const updateSchema = createOwnedProjectSchema.partial().strict();

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
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Project could not be loaded." }, { status: 500 });
    }

    const project = visibleProject((data as ProjectRow | null) ?? null, user.id);
    if (!project) {
      return notFound();
    }

    return NextResponse.json({ project: toPublicProject(project) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const projectId = await readProjectId(context);
    if (!projectId) {
      return notFound();
    }

    const input = parseWithSchema(updateSchema, await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .update(toProjectUpdate(user.id, input))
      .eq("id", projectId)
      .select(PROJECT_COLUMNS)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Project could not be updated." }, { status: 400 });
    }

    const project = visibleProject((data as ProjectRow | null) ?? null, user.id);
    if (!project) {
      return notFound();
    }

    return NextResponse.json({ project: toPublicProject(project) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
