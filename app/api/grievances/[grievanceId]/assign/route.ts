import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { assignDepartmentGrievance } from "@/lib/grievances/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ grievanceId: z.uuid() });

type RouteContext = { params: Promise<{ grievanceId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Grievance not found." }, { status: 404 });
    }
    const result = await assignDepartmentGrievance(params.data.grievanceId);
    if (result.status === 200) return NextResponse.json({ status: "assigned" });
    if (result.status === 404) {
      return NextResponse.json({ error: "Grievance not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Grievance could not be assigned." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
