import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { uploadOwnedDocument } from "@/lib/documents/records";
import { toVaultDocument } from "@/lib/documents/present";
import { authErrorResponse } from "@/lib/auth/http";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ applicationId: z.uuid() });
const approvalSchema = z.uuid();

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const { applicationId } = parseWithSchema(paramsSchema, await context.params);
    const form = await request.formData();
    const file = form.get("file");
    const name = form.get("name");
    const category = form.get("category");
    const authority = form.get("authority");
    const approval = form.get("applicationApprovalId");

    if (!(file instanceof File) || typeof name !== "string" || typeof category !== "string") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    let applicationApprovalId: string | null = null;
    if (typeof approval === "string" && approval.trim()) {
      const parsed = approvalSchema.safeParse(approval);
      if (!parsed.success) {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      }
      applicationApprovalId = parsed.data;
    }

    const result = await uploadOwnedDocument({
      applicationId,
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      name,
      category,
      authority: typeof authority === "string" ? authority : "",
      applicationApprovalId,
    });

    if (result.status === 201) {
      return NextResponse.json({ document: toVaultDocument(result.document) }, { status: 201 });
    }
    if (result.status === 400) {
      return NextResponse.json({ error: "Invalid request.", reason: result.reason }, { status: 400 });
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Document could not be stored." }, { status: 503 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return authErrorResponse(error);
  }
}
