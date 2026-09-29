import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getOwnedDocument } from "@/lib/documents/records";
import { readGeminiKey } from "@/lib/knowledge/model";
import { authErrorResponse } from "@/lib/auth/http";
import { parseWithSchema } from "@/lib/validations/parse";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  documentId: z.uuid(),
}).strict();

/**
 * Optional automated extraction for a document the caller already owns.
 * A missing model, or a failed model call, leaves the document uploaded.
 * This is not departmental verification.
 */
export async function POST(request: Request) {
  if (!readPublicSupabaseConfig()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const { documentId } = parseWithSchema(bodySchema, await request.json());
    const document = await getOwnedDocument(documentId);
    if (!document.ok) {
      return NextResponse.json({ error: "Document could not be analyzed." }, { status: 503 });
    }
    if (!document.data) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const apiKey = readGeminiKey();
    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        analyzed: false,
        status: document.data.status,
      });
    }

    const prompt = `Extract only facts explicitly present in this filename. Do not invent values. Do not decide whether the document is officially verified. Return JSON with documentType, enterpriseName, projectName, investmentAmount, location, proposedCapacity, registrationNumber, issuingAuthority. Use null when unknown. Filename: ${document.data.file_name}`;
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ ok: true, analyzed: false, status: document.data.status });
    }

    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    const extracted = raw ? JSON.parse(raw) : null;
    if (!extracted || typeof extracted !== "object") {
      return NextResponse.json({ ok: true, analyzed: false, status: document.data.status });
    }

    const analysis = {
      ...extracted,
      automated: true,
      officialVerification: false,
    };
    const supabase = await createClient();
    const recorded = await supabase.rpc("record_document_analysis", {
      target_document: documentId,
      payload: analysis,
    });
    if (recorded.error) {
      return NextResponse.json({ ok: true, analyzed: false, status: document.data.status });
    }

    return NextResponse.json({
      ok: true,
      analyzed: true,
      status: "uploaded",
      analysis,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
