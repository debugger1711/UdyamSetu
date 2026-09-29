import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth/session";

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue?.message || "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Request failed." }, { status: 500 });
}
