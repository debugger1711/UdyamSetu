import type { UserRole } from "../../types/user";

export type AppRole = UserRole;

const APPLICANT_PREFIXES = [
  "/dashboard",
  "/projects",
  "/applications",
  "/approvals",
  "/approval-map",
  "/documents",
  "/inspections",
  "/renewals",
  "/schemes",
  "/messages",
  "/grievances",
  "/settings",
  "/help",
];

const OFFICER_PREFIXES = [
  "/officer-dashboard",
  "/officer-applications",
  "/officer-inspections",
];

const SHARED_PREFIXES = ["/notifications", "/analytics", "/regulatory-knowledge"];

export type RouteDecision = { type: "allow" } | { type: "redirect"; to: string };

export function isAppRole(value: unknown): value is AppRole {
  return value === "applicant" || value === "officer" || value === "admin";
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function decideRouteAccess(pathname: string, role: AppRole | null): RouteDecision {
  const applicantArea = matchesPrefix(pathname, APPLICANT_PREFIXES);
  const officerArea = matchesPrefix(pathname, OFFICER_PREFIXES);
  const sharedArea = matchesPrefix(pathname, SHARED_PREFIXES);
  const protectedArea = applicantArea || officerArea || sharedArea;

  if (!protectedArea) {
    return { type: "allow" };
  }

  if (!role) {
    return { type: "redirect", to: "/login" };
  }

  if (role === "admin") {
    return { type: "allow" };
  }

  if (officerArea && role !== "officer") {
    return { type: "redirect", to: "/dashboard" };
  }

  if (applicantArea && role === "officer") {
    return { type: "redirect", to: "/officer-dashboard" };
  }

  return { type: "allow" };
}

export function canAccessOwnedRow(ownerId: string | null, actorId: string): boolean {
  return ownerId !== null && ownerId === actorId;
}

export function canAccessApplication(
  projectOwnerId: string | null,
  actorId: string,
): boolean {
  return canAccessOwnedRow(projectOwnerId, actorId);
}

/** Signup always creates an applicant. A role sent by the browser is ignored. */
export function roleAssignedAtSignup(): "applicant" {
  return "applicant";
}

export function isRoleAllowed(role: AppRole, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role);
}
