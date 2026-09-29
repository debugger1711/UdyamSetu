import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/http";
import { createOwnedProjectSchema } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/session";
import { PROJECT_COLUMNS, toProjectInsert, toPublicProject, visibleProjects, type ProjectRow } from "@/lib/projects/record";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Projects could not be loaded." }, { status: 500 });
    }

    const projects = visibleProjects((data ?? []) as ProjectRow[], user.id).map(toPublicProject);
    return NextResponse.json({ projects });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const input = parseWithSchema(createOwnedProjectSchema, await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert(toProjectInsert(user.id, input))
      .select(PROJECT_COLUMNS)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project could not be created." }, { status: 400 });
    }

    return NextResponse.json({ project: toPublicProject(data as ProjectRow) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
