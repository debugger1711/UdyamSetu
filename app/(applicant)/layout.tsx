import { AppShell } from "@/components/layout/app-shell";
import { loadShellIdentity, loadSidebarProject } from "@/lib/shell/load";

export default async function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projectCard, identity] = await Promise.all([loadSidebarProject(), loadShellIdentity()]);
  return <AppShell role="applicant" projectCard={projectCard} identity={identity}>{children}</AppShell>;
}
