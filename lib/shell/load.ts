import "server-only";

import { AuthorizationError, getCurrentProfile, type CurrentProfile } from "@/lib/auth/session";
import { listOwnedProjects } from "@/lib/projects/queries";
import { presentSidebarProject } from "@/lib/shell/present";

export async function loadShellIdentity(): Promise<Pick<CurrentProfile, "fullName" | "email" | "role"> | null> {
  try {
    const profile = await getCurrentProfile();
    return { fullName: profile.fullName, email: profile.email, role: profile.role };
  } catch {
    return null;
  }
}

export async function loadSidebarProject(): Promise<{ name: string; detail: string }> {
  try {
    const result = await listOwnedProjects();
    if (!result.ok) {
      return { name: "Not recorded", detail: "The project list is not available." };
    }
    return presentSidebarProject(result.data.map((row) => ({
      id: row.id,
      name: row.name,
      entity_name: row.entity_name,
      location: row.location,
    })));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { name: "Not recorded", detail: "Not recorded" };
    }
    return { name: "Not recorded", detail: "The project list is not available." };
  }
}
