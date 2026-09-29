import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { toPublicApplication } from "@/lib/applications/record";
import { getOwnedApplication } from "@/lib/applications/queries";
import { authErrorResponse } from "@/lib/auth/http";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ applicationId: z.uuid() });

type RouteContext = { params: Promise<{ applicationId: string }> };

function notFound() {
  return NextResponse.json({ error: "Application not found." }, { status: 404 });
}

export async function GET(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    let applicationId: string;
    try {
      applicationId = parseWithSchema(paramsSchema, await context.params).applicationId;
    } catch (error) {
      if (error instanceof ZodError) {
        return notFound();
      }
      throw error;
    }

    const result = await getOwnedApplication(applicationId);
    if (!result.ok) {
      return NextResponse.json({ error: "Application could not be loaded." }, { status: 500 });
    }
    if (!result.data || result.data.id !== applicationId) {
      return notFound();
    }

    return NextResponse.json({
      application: {
        ...toPublicApplication(result.data),
        project_name: result.data.project_name,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
