"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  Network,
  FolderOpen,
  Calendar,
  RotateCcw,
  Gift,
  MessageSquare,
  ShieldCheck,
  BookOpen,
  BarChart2,
  HelpCircle,
  Building2,
  Sparkles,
} from "lucide-react";

interface AppSidebarProps {
  role?: "applicant" | "officer";
  isOpen?: boolean;
  onClose?: () => void;
  projectCard?: { name: string; detail: string };
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const applicantNav: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "My Applications",
    href: "/applications",
    icon: FileText,
  },
  {
    title: "Approval Map",
    href: "/approvals",
    icon: Network,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    title: "Inspections",
    href: "/inspections",
    icon: Calendar,
  },
  {
    title: "Renewals",
    href: "/renewals",
    icon: RotateCcw,
  },
  {
    title: "Schemes & Incentives",
    href: "/schemes",
    icon: Gift,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Grievances",
    href: "/grievances",
    icon: ShieldCheck,
  },
  {
    title: "Regulatory Knowledge",
    href: "/regulatory-knowledge",
    icon: BookOpen,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart2,
  },
  {
    title: "Help",
    href: "/help",
    icon: HelpCircle,
  },
];

const officerNav: NavItem[] = [
  {
    title: "Overview",
    href: "/officer-dashboard",
    icon: LayoutGrid,
  },
  {
    title: "My Applications",
    href: "/officer-applications",
    icon: FileText,
  },
  {
    title: "Inspections",
    href: "/officer-inspections",
    icon: Calendar,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart2,
  },
  {
    title: "Regulatory Knowledge",
    href: "/regulatory-knowledge",
    icon: BookOpen,
  },
  {
    title: "Applicant Mode",
    href: "/dashboard",
    icon: Building2,
  },
];

export function AppSidebar({
  role = "applicant",
  isOpen = false,
  onClose,
  projectCard = { name: "Not recorded", detail: "Not recorded" },
}: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = role === "officer" || pathname.startsWith("/officer") ? officerNav : applicantNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Dark Navy matching Figma #0b1a2d */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-[#09192e] text-slate-200 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col justify-between overflow-y-auto border-r border-[#152e4d]`}
      >
        <div className="p-3.5 space-y-4">
          {/* Logo Brand Header */}
          <Link href="/" className="flex items-center gap-2.5 px-1 py-1 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <line x1="12" y1="20" x2="12" y2="8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white text-[15px] leading-tight">
                UdyamSetu
              </span>
              <span className="text-[9px] uppercase tracking-wider text-teal-400 font-semibold leading-tight">
                Unified Industrial Gateway
              </span>
            </div>
          </Link>

          {/* Active Project Card */}
          <div className="rounded-xl border border-[#1b3b5e] bg-[#112942]/90 p-2.5 shadow-inner">
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-500/20 text-teal-400">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 block leading-none">
                  Active Project
                </span>
                <span className="text-xs font-semibold text-white truncate block mt-0.5">
                  {projectCard.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {projectCard.detail}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/officer-dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#143657] text-white shadow-xs font-semibold border-l-2 border-teal-400"
                      : "text-slate-400 hover:bg-[#112942] hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.title}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        item.badgeColor || "bg-slate-700 text-slate-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Insight Card matching Figma */}
        <div className="p-3 m-3 rounded-xl border border-teal-500/20 bg-gradient-to-br from-[#102c46] to-[#0c2237] text-xs">
          <div className="flex items-start gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/20 text-teal-300">
              <Sparkles className="h-3 w-3" />
            </div>
            <div>
              <span className="font-semibold text-white text-[11px] block">
                Not recorded
              </span>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                Time saved is not recorded
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
