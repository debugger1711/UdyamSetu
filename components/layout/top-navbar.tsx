"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Network,
  ArrowRight,
  LogOut,
  Building2,
} from "lucide-react";
import { APPROVAL_CATALOG } from "@/lib/approvals/catalog";
import { filterShellSearch, profileInitials, type ShellProject, type ShellSearchItem } from "@/lib/shell/present";

type SessionProfile = {
  email: string;
  fullName: string;
  role: "applicant" | "officer" | "admin";
};

interface TopNavbarProps {
  role?: "applicant" | "officer";
  onToggleSidebar?: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  identity?: SessionProfile | null;
}

function catalogSearchItems(): ShellSearchItem[] {
  return APPROVAL_CATALOG.map((entry) => ({
    title: entry.name,
    category: "Approval",
    url: "/approvals",
    description: entry.department ?? "Not recorded",
  }));
}

export function TopNavbar({
  onToggleSidebar,
  breadcrumbs,
  identity = null,
}: TopNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionProfile | null | undefined>(identity);
  const isOfficer = session?.role === "officer" || session?.role === "admin" || ((session === null || session === undefined) && pathname.startsWith("/officer"));

  const [searchOpen, setSearchOpen] = useState(false);
  const [realUnread, setRealUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchItems, setSearchItems] = useState<ShellSearchItem[]>(catalogSearchItems);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notifications", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setRealUnread(0);
          return;
        }
        const payload = await response.json() as { unread?: number };
        setRealUnread(typeof payload.unread === "number" ? payload.unread : 0);
      })
      .catch(() => setRealUnread(0));
    return () => controller.abort();
  }, [pathname]);

  // Keyboard shortcut listener for Command+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setSession((current) => current ?? null);
          return;
        }
        setSession((await response.json()) as SessionProfile);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession((current) => current ?? null);
      });
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    const controller = new AbortController();
    fetch("/api/projects", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { projects?: ShellProject[] };
        const projects = (payload.projects ?? []).map((project) => ({
          title: project.entity_name?.trim() || project.name,
          category: "Project" as const,
          url: `/projects/${project.id}`,
          description: project.location?.trim() || "Not recorded",
        }));
        setSearchItems([...projects, ...catalogSearchItems()]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSearchItems(catalogSearchItems());
      });
    return () => controller.abort();
  }, [searchOpen]);

  const filteredResults = filterShellSearch(searchQuery, searchItems);

  const handleSelectResult = (url: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(url);
  };

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    router.push("/login");
    router.refresh();
  }

  // Determine current section name for breadcrumbs if not provided
  const getSectionName = () => {
    if (pathname.includes("/approval-map") || pathname.includes("/approvals")) return "Approval Map";
    if (pathname.includes("/applications/")) return "Application Journey";
    if (pathname.includes("/applications")) return "Application Workspace";
    if (pathname.includes("/documents")) return "Documents & Pre-validation";
    if (pathname.includes("/inspections")) return "Inspections";
    if (pathname.includes("/schemes")) return "Schemes & Incentives";
    if (pathname.includes("/notifications")) return "Alert Centre";
    if (pathname.includes("/regulatory-knowledge")) return "Regulatory Knowledge";
    if (pathname.includes("/analytics")) return isOfficer ? "Bottleneck Analytics" : "Approval Intelligence";
    if (pathname.includes("/officer-applications/")) return "Dossier Review";
    if (pathname.includes("/officer-applications")) return "Applications Scrutiny";
    if (pathname.includes("/officer-dashboard")) return "Command Center";
    if (pathname.includes("/projects/new")) return "Register Project";
    return "Overview";
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#e2e8f0] bg-white px-4 sm:px-6">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <Link href="/" className="font-semibold text-slate-800 hover:text-cyan-700">
              UdyamSetu
            </Link>
            <span className="text-slate-400">›</span>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-slate-400">›</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-slate-500 hover:text-slate-800">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">{crumb.label}</span>
                  )}
                </span>
              ))
            ) : (
              <span className="font-medium text-slate-700">{getSectionName()}</span>
            )}
          </nav>
        </div>

        {/* Center: Global Search Bar matching Figma */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div
            onClick={() => setSearchOpen(true)}
            className="relative w-full cursor-pointer group"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
            <div className="h-8 w-full rounded-full border border-slate-200 bg-slate-50/70 pl-9 pr-12 text-xs text-slate-400 flex items-center group-hover:border-slate-300 group-hover:bg-white transition-colors">
              Search applications, approvals, documents...
            </div>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-2xs">
              ⌘ K
            </kbd>
          </div>
        </div>

        {/* Right Controls: Notifications, Language, Role Switcher, Profile Avatar */}
        <div className="flex items-center gap-3">
          {/* Notification Bell with Badge */}
          <Link
            href="/notifications"
            className="relative rounded-full p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notifications & Alerts"
          >
            <Bell className="h-4 w-4" />
            {realUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-2xs">
                {realUnread}
              </span>
            )}
          </Link>

          {/* Language selector */}
          <div className="hidden sm:flex items-center gap-0.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-slate-900">
            <span>EN</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </div>

          {/* Role Switcher Pill (Applicant ↔ Officer Toggle) */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs"
            title="Role comes from your profile"
          >
            <span>{session?.role === "admin" ? "Admin" : session?.role === "officer" ? "Officer" : session?.role === "applicant" ? "Applicant" : "Not recorded"}</span>
          </div>

          {session ? (
            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3 w-3 text-slate-400" />
              <span>Sign out</span>
            </button>
          ) : null}

          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b192c] text-xs font-bold text-white shadow-2xs"
            title={session ? `${session.fullName} (${session.email})` : "Not recorded"}
          >
            {profileInitials(session?.fullName ?? null)}
          </div>
        </div>
      </header>

      {/* GLOBAL SEARCH COMMAND MODAL (Section 22) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in-20">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95">
            {/* Input Header */}
            <div className="relative flex items-center border-b border-slate-200 p-3.5">
              <Search className="h-4 w-4 text-slate-400 absolute left-4" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by approval name, document, application ID (e.g. Consent, Factory, Inspection)..."
                className="w-full pl-8 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
              {filteredResults.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  No matching approvals, applications, or documents found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredResults.map((result, idx) => {
                  const getCategoryIcon = () => {
                    switch (result.category) {
                      case "Approval":
                        return <Network className="h-4 w-4 text-teal-600" />;
                      case "Project":
                        return <Building2 className="h-4 w-4 text-cyan-600" />;
                    }
                  };

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectResult(result.url)}
                      className="p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-white group-hover:shadow-xs transition-all">
                          {getCategoryIcon()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{result.title}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {result.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{result.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4">
              <span>Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">ESC</kbd> to close</span>
              <span>Quick navigation across UdyamSetu</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
