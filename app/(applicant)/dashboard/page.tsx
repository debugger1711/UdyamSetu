import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileText,
  Network,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { AuthorizationError } from "@/lib/auth/session";
import { loadApplicantDashboard } from "@/lib/dashboard/load";
import type { DashboardStep } from "@/lib/dashboard/present";

export const dynamic = "force-dynamic";

const ACTION_ICONS = [AlertTriangle, MessageSquare, Calendar] as const;
const ACTION_ICON_CLASS = [
  "bg-red-50 text-red-600",
  "bg-amber-50 text-amber-600",
  "bg-blue-50 text-blue-600",
] as const;
const BAR_CLASS = ["bg-emerald-600", "bg-teal-600", "bg-teal-600", "bg-teal-600", "bg-teal-600"] as const;

function stepMarkerClass(marker: DashboardStep["marker"]) {
  if (marker === "complete") {
    return "flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs mb-1.5 shadow-2xs group-hover:scale-105 transition-transform";
  }
  if (marker === "current") {
    return "flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs mb-1.5 shadow-2xs group-hover:scale-105 transition-transform bg-teal-600 text-white ring-4 ring-teal-50";
  }
  return "flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-500 font-bold text-xs mb-1.5 group-hover:scale-105 transition-transform";
}

export default async function DashboardOverviewPage() {
  let view;
  try {
    view = await loadApplicantDashboard();
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/login");
    throw error;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {view.dateLabel}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Good morning, {view.greetingName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {view.projectLine}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>New project</span>
          </Link>
          <Link
            href="/approvals"
            className="flex items-center gap-1.5 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <Network className="h-3.5 w-3.5 text-teal-400" />
            <span>View approval map</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/approvals"
          className="rounded-xl border border-slate-200 bg-white p-4 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer block"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-700" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                {view.totalApprovals}
              </span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                Total approvals
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {view.departmentCaption}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
              <Network className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <Link
          href="/approvals"
          className="rounded-xl border border-slate-200 bg-white p-4 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer block"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                {view.completedApprovals}
              </span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                Completed
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                {view.completedCaption}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <Link
          href="/approvals"
          className="rounded-xl border border-slate-200 bg-white p-4 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer block"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                {view.inProgressApprovals}
              </span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                In progress
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {view.slaCaption}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <Link
          href="/applications"
          className="rounded-xl border border-slate-200 bg-white p-4 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer block"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                {view.actionsRequired}
              </span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                Actions required
              </span>
              <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                {view.actionsCaption}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Project Health
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  {view.healthTitle}
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {view.healthBadge}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#0d9488"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - view.progress)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-slate-900 block leading-none">
                    {Math.round(view.progress * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">
                    Overall progress
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2 text-xs">
                {view.bars.map((bar, index) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-700">{bar.label}</span>
                      <span className="font-bold text-slate-900">{bar.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${BAR_CLASS[index] ?? "bg-teal-600"}`} style={{ width: `${bar.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/approvals"
            className="mt-4 flex items-center justify-between rounded-lg bg-teal-50/70 border border-teal-100 p-2.5 text-xs text-teal-900 hover:bg-teal-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="font-semibold text-teal-800">
                {view.timeSaved}
              </span>
              <span className="text-teal-700 hidden sm:inline">
                {view.parallelCaption}
              </span>
            </div>
            <span className="text-[11px] font-bold text-teal-800 flex items-center gap-0.5">
              See how →
            </span>
          </Link>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Next Best Actions
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  {view.attentionTitle}
                </h2>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-[11px]">
                {view.attentionCount}
              </span>
            </div>

            <div className="space-y-2.5">
              {view.actions.map((action, index) => {
                const Icon = ACTION_ICONS[index] ?? AlertTriangle;
                return (
                  <Link
                    key={`${action.href}-${index}`}
                    href={action.href}
                    className="group flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50/70 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACTION_ICON_CLASS[index] ?? ACTION_ICON_CLASS[0]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block group-hover:text-cyan-700">
                          {action.title}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {action.detail}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Approval Journey
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              From setup to operation
            </h2>
          </div>
          <Link
            href={view.timelineHref}
            className="text-xs font-semibold text-cyan-800 hover:underline"
          >
            Full timeline
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative">
          {view.steps.map((step, index) => (
            <Link key={step.label} href={step.href} className="flex flex-col items-center text-center group cursor-pointer">
              <div className={stepMarkerClass(step.marker)}>
                {step.marker === "complete" ? "✓" : index + 1}
              </div>
              <span className={step.marker === "upcoming" ? "text-xs font-medium text-slate-600 group-hover:text-teal-700" : step.marker === "current" ? "text-xs font-bold text-slate-900 group-hover:text-teal-700" : "text-xs font-semibold text-slate-900 group-hover:text-teal-700"}>
                {step.label}
              </span>
              <span className={step.marker === "complete" ? "text-[10px] text-emerald-600 font-medium" : step.marker === "current" ? "text-[10px] font-semibold text-teal-700" : "text-[10px] text-slate-400"}>
                {step.caption}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40">
        <Link
          href="/regulatory-knowledge"
          className="flex items-center gap-2 rounded-full bg-[#0a1f36] hover:bg-[#122e50] text-white px-4 py-2.5 shadow-xl border border-teal-500/30 transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-400 text-slate-950">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="text-left">
            <span className="text-[8px] uppercase tracking-wider text-teal-300 font-bold block leading-tight">
              UdyamSetu AI
            </span>
            <span className="text-xs font-bold text-white block leading-tight">
              Ask UdyamSetu
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
