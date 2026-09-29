import "server-only";

import type { User } from "@supabase/supabase-js";

import { isAppRole, isRoleAllowed, type AppRole } from "@/lib/auth/access";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export type CurrentProfile = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export async function getAuthenticatedUser(): Promise<User | null> {
  if (!readPublicSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function requireUser(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthorizationError(401, "Authentication required.");
  }
  return user;
}

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !isAppRole(data.role)) {
    throw new AuthorizationError(403, "Profile is not available.");
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  };
}

export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  return requireAnyRole([role]);
}

export async function requireAnyRole(roles: AppRole[]): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!isRoleAllowed(profile.role, roles)) {
    throw new AuthorizationError(403, "Forbidden.");
  }
  return profile;
}
