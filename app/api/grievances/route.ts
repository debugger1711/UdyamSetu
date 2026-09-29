import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/lib/auth/http";
import { createOwnGrievance } from "@/lib/grievances/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  applicationId: z.uuid().optional(),
  departmentId: z.uuid().optional(),
}).strict();

export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const result = await createOwnGrievance({
      applicationId: body.data.applicationId ?? null,
      departmentId: body.data.departmentId ?? null,
      subject: body.data.subject,
      description: body.data.description,
    });
    if (result.status === 201) {
      return NextResponse.json({ grievanceId: result.grievanceId, status: "open" }, { status: 201 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Grievance could not be recorded." }, { status: 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
