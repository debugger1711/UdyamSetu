/**
 * Labels for the existing sidebar, navbar, and settings slots.
 * Missing records stay unrecorded. Pending work is not counted as time saved.
 */

export type ShellProject = {
  id: string;
  name: string;
  entity_name: string | null;
  location: string | null;
};

export type ShellSearchItem = {
  title: string;
  category: "Project" | "Approval";
  url: string;
  description: string;
};

export function presentSidebarProject(projects: ShellProject[]): { name: string; detail: string } {
  const project = projects[0];
  if (!project) {
    return { name: "No project is recorded", detail: "Not recorded" };
  }
  return {
    name: project.entity_name?.trim() || project.name,
    detail: project.location?.trim() || "Not recorded",
  };
}

export function profileInitials(fullName: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export function settingsFields(input: { fullName: string | null; email: string | null }): {
  representative: string;
  email: string;
  mobile: string;
  taxIdentity: string;
} {
  return {
    representative: input.fullName?.trim() || "Not recorded",
    email: input.email?.trim() || "Not recorded",
    mobile: "Not recorded",
    taxIdentity: "Not recorded",
  };
}

export function unreadFromRows(rows: Array<{ readAt: string | null }>): number {
  return rows.filter((row) => row.readAt == null).length;
}

export function filterShellSearch(query: string, items: ShellSearchItem[]): ShellSearchItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items.slice(0, 5);
  return items.filter((item) =>
    item.title.toLowerCase().includes(trimmed) || item.description.toLowerCase().includes(trimmed),
  );
}
