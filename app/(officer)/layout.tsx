import { AppShell } from "@/components/layout/app-shell";
import { loadShellIdentity, loadSidebarProject } from "@/lib/shell/load";

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projectCard, identity] = await Promise.all([loadSidebarProject(), loadShellIdentity()]);
  return <AppShell role="officer" projectCard={projectCard} identity={identity}>{children}</AppShell>;
}
