"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  FileCheck2,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalyticsView, DepartmentRow } from "@/lib/analytics/metrics";

const TIMEFRAMES = [
  { id: "monthly", label: "Monthly" },
  { id: "q3-2025", label: "Q3 2025" },
  { id: "ytd", label: "YTD" },
] as const;

const UNAVAILABLE: AnalyticsView = {
  scopeLabel: "Scope: unavailable",
  slaCompliance: "Unavailable",
  slaDetail: "Analytics is not available.",
  slaTrend: "Not recorded",
  turnaround: "Unavailable",
  turnaroundDetail: "Analytics is not available.",
  turnaroundTrend: "Not recorded",
  queryRate: "Unavailable",
  queryDetail: "Analytics is not available.",
  queryTrend: "Not recorded",
  inspections: "Unavailable",
  inspectionDetail: "Analytics is not available.",
  inspectionTrend: "Not recorded",
  bannerTitle: "Lead-time reduction: Not recorded",
  bannerBody: "Analytics is not available.",
  departments: [],
};

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<(typeof TIMEFRAMES)[number]["id"]>("q3-2025");
  const [result, setResult] = useState<{
    timeframe: (typeof TIMEFRAMES)[number]["id"];
    view: AnalyticsView | null;
    failed: boolean;
  }>({ timeframe: "q3-2025", view: null, failed: false });

  useEffect(() => {
    let active = true;
    fetch(`/api/analytics?timeframe=${selectedTimeframe}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { view?: AnalyticsView } | null;
        if (!active) return;
        setResult({
          timeframe: selectedTimeframe,
          view: response.ok && body?.view ? body.view : null,
          failed: !response.ok || !body?.view,
        });
      })
      .catch(() => {
        if (active) {
          setResult({ timeframe: selectedTimeframe, view: null, failed: true });
        }
      });
    return () => {
      active = false;
    };
  }, [selectedTimeframe]);

  const pending = result.timeframe !== selectedTimeframe || (!result.view && !result.failed);
  const display = pending ? null : result.failed ? UNAVAILABLE : result.view;
  const departments: DepartmentRow[] = display?.departments ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Intelligence & SLA Analytics"
        description="Recorded application, query, inspection, and system SLA counts for the selected period."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300">
            {display?.scopeLabel ?? "Scope: loading"}
          </Badge>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {TIMEFRAMES.map((timeframe) => (
              <button
                key={timeframe.id}
                onClick={() => setSelectedTimeframe(timeframe.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedTimeframe === timeframe.id
                    ? "bg-[#09192e] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">SLA Compliance Rate</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{display?.slaCompliance ?? "…"}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>{display?.slaTrend ?? "Not recorded"}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{display?.slaDetail ?? "System-recorded SLA only"}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Approval Turnaround</span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{display?.turnaround ?? "…"}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <ArrowDownRight className="h-3.5 w-3.5" />
            <span>{display?.turnaroundTrend ?? "Not recorded"}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{display?.turnaroundDetail ?? "Statutory cap: Not recorded"}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Deficiency Query Rate</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{display?.queryRate ?? "…"}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <ArrowDownRight className="h-3.5 w-3.5" />
            <span>{display?.queryTrend ?? "Not recorded"}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{display?.queryDetail ?? "0 queries across 0 applications"}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Coordinated Inspections</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{display?.inspections ?? "…"}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-purple-700 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{display?.inspectionTrend ?? "Not recorded"}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{display?.inspectionDetail ?? "Consolidation is not recorded."}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#09192e] via-[#0d2a4d] to-[#09192e] rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Parallel Processing Efficiency Insight
          </div>
          <h3 className="text-lg font-bold">
            {display?.bannerTitle ?? "Lead-time reduction: Not recorded"}
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {display?.bannerBody ?? "Statutory day savings are not recorded."}
          </p>
        </div>
        <Link href="/approvals" className="shrink-0">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9 px-4 gap-1.5"
          >
            Explore Dependency Map
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Departmental Turnaround & SLA Compliance
            </h3>
            <p className="text-xs text-slate-500">
              System-recorded deadlines only. Statutory caps are not stored.
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-slate-600 border-slate-300">
            Counts from recorded rows
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3.5 font-semibold">Department & Clearance</th>
                <th className="p-3.5 font-semibold">Average Disposal Time</th>
                <th className="p-3.5 font-semibold">Statutory SLA Cap</th>
                <th className="p-3.5 font-semibold">On-Time Disposal</th>
                <th className="p-3.5 font-semibold">Performance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.length === 0 ? (
                <tr>
                  <td className="p-3.5 text-slate-500" colSpan={5}>
                    {pending ? "…" : result.failed ? "Analytics is not available." : "No department workload is recorded."}
                  </td>
                </tr>
              ) : departments.map((department) => (
                <tr key={department.department} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-900 block">{department.department}</span>
                    <span className="text-[11px] text-slate-500">{department.service}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{department.avgDays}</span>
                      <span className="text-[11px] text-slate-500 font-medium">({department.trend})</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600">{department.slaLimit}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            department.complianceRate == null
                              ? "bg-slate-300"
                              : department.complianceRate >= 90
                              ? "bg-emerald-500"
                              : department.complianceRate >= 80
                              ? "bg-teal-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${department.complianceRate ?? 0}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-800">
                        {department.complianceRate == null ? "Not recorded" : `${department.complianceRate}%`}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge variant="outline" className={`text-[10px] font-semibold ${department.statusColor}`}>
                      {department.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
