import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideRouteAccess, isAppRole, type AppRole } from "../auth/access";
import { readPublicSupabaseConfig } from "./env";

function redirectWithSession(request: NextRequest, sessionResponse: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of sessionResponse.headers.getSetCookie()) {
    redirectResponse.headers.append("set-cookie", cookie);
  }
  return redirectResponse;
}

/**
 * Refreshes the Supabase session cookie.
 * When public Supabase config is present, protected pages are redirected
 * according to the profile role. API routes authorize themselves.
 * When config is missing, the existing demo pages stay reachable.
 */
export async function updateSession(request: NextRequest) {
  const config = readPublicSupabaseConfig();
  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    const userId = typeof subject === "string" ? subject : null;
    let role: AppRole | null = null;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile && isAppRole(profile.role)) {
        role = profile.role;
      }
    }

    const decision = decideRouteAccess(request.nextUrl.pathname, role);
    if (decision.type === "redirect") {
      return redirectWithSession(request, supabaseResponse, decision.to);
    }

    return supabaseResponse;
  } catch {
    const decision = decideRouteAccess(request.nextUrl.pathname, null);
    if (decision.type === "redirect") {
      const url = request.nextUrl.clone();
      url.pathname = decision.to;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }
}
