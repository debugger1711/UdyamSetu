import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/constants";
import { checkDatabaseConnection, healthHttpStatus } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseReachable = await checkDatabaseConnection();
  const httpStatus = healthHttpStatus(databaseReachable);

  return NextResponse.json(
    {
      status: databaseReachable ? "ok" : "degraded",
      service: "udyamsetu",
      version: APP_CONFIG.version,
      database: databaseReachable ? "reachable" : "unreachable",
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus },
  );
}
