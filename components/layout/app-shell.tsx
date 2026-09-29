"use client";

import { useState } from "react";
import { TopNavbar } from "./top-navbar";
import { AppSidebar } from "./app-sidebar";

interface AppShellProps {
  children: React.ReactNode;
  role?: "applicant" | "officer";
  breadcrumbs?: Array<{ label: string; href?: string }>;
  projectCard?: { name: string; detail: string };
  identity?: { fullName: string; email: string; role: "applicant" | "officer" | "admin" } | null;
}

export function AppShell({ children, role = "applicant", breadcrumbs, projectCard, identity = null }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-800 flex flex-col font-sans">
      <AppSidebar
        role={role}
        projectCard={projectCard}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 md:pl-60 flex flex-col transition-all duration-200">
        <TopNavbar
          role={role}
          identity={identity}
          breadcrumbs={breadcrumbs}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
