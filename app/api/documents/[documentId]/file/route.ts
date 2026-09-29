import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DOCUMENT_BUCKET } from "@/lib/documents/validate-upload";
import { getOwnedDocument } from "@/lib/documents/records";
import { getDepartmentDocument } from "@/lib/workflow/records";
import { authErrorResponse } from "@/lib/auth/http";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ documentId: z.uuid() });

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const { documentId } = parseWithSchema(paramsSchema, await context.params);
    const owned = await getOwnedDocument(documentId);
    if (!owned.ok) {
      return NextResponse.json({ error: "Document could not be loaded." }, { status: 503 });
    }
    let file = owned.data
      ? {
          storage_path: owned.data.storage_path,
          mime_type: owned.data.mime_type,
          file_name: owned.data.file_name,
        }
      : null;
    if (!file) {
      const department = await getDepartmentDocument(documentId);
      if (!department.ok) {
        return NextResponse.json({ error: "Document could not be loaded." }, { status: 503 });
      }
      file = department.data;
    }
    if (!file) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const supabase = await createClient();
    const downloaded = await supabase.storage.from(DOCUMENT_BUCKET).download(file.storage_path);
    if (downloaded.error || !downloaded.data) {
      return NextResponse.json({ error: "Document could not be loaded." }, { status: 503 });
    }

    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mime_type,
        "Content-Disposition": `attachment; filename="${file.file_name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    return authErrorResponse(error);
  }
}
